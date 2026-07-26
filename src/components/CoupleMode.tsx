import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Settings2, ArrowRight, Scale, TrendingUp, SlidersHorizontal, Home,
  Sparkles, Check, Plus, X, Pencil,
} from "lucide-react";
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

const fmt = (v: number) =>
  `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STORAGE_KEY = "couple_mode_config_v2";

// Split modes
type SplitMode = "equal" | "proportional" | "custom" | "category";
type CustomKind = "percent" | "fixed";

interface CoupleConfig {
  enabled: boolean;
  personA: string | null;
  personB: string | null;
  mode: SplitMode;
  // proportional
  incomeA: number;
  incomeB: number;
  useManualIncome: boolean;
  // custom
  customKind: CustomKind;
  percentA: number;      // 0-100 (B = 100 - A)
  fixedA: number;        // €
  fixedB: number;        // €
  // categories
  categoryOwner: Record<string, "A" | "B">;
  // future AI hook (not implemented)
  aiLearning?: boolean;
}

const DEFAULT_CONFIG: CoupleConfig = {
  enabled: false, personA: null, personB: null, mode: "equal",
  incomeA: 0, incomeB: 0, useManualIncome: false,
  customKind: "percent", percentA: 50, fixedA: 0, fixedB: 0,
  categoryOwner: {}, aiLearning: false,
};

const MODE_META: Record<SplitMode, { icon: typeof Scale; title: string; desc: string; color: string }> = {
  equal:        { icon: Scale,             title: "50/50",        desc: "Cada pessoa paga metade.",                                      color: "from-emerald-500/15 to-emerald-500/5 text-emerald-600" },
  proportional: { icon: TrendingUp,        title: "Proporcional", desc: "Divide automaticamente conforme o rendimento.",                 color: "from-sky-500/15 to-sky-500/5 text-sky-600" },
  custom:       { icon: SlidersHorizontal, title: "Personalizado",desc: "Defina as regras da vossa casa.",                                color: "from-violet-500/15 to-violet-500/5 text-violet-600" },
  category:     { icon: Home,              title: "Categorias",   desc: "Cada pessoa fica responsável por certas categorias.",           color: "from-amber-500/15 to-amber-500/5 text-amber-600" },
};

export const CoupleMode = ({
  fixedExpenses, variableExpenses, incomes, salaryConfigs,
  people, selectedMonth, onUpdatePeople,
}: Props) => {
  const [config, setConfig] = useState<CoupleConfig>(DEFAULT_CONFIG);
  const [editing, setEditing] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");

  // load config
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(raw) });
      } else if (people.length >= 2) {
        setConfig({ ...DEFAULT_CONFIG, personA: people[0], personB: people[1] });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (next: CoupleConfig) => {
    setConfig(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const addPerson = () => {
    const name = newPersonName.trim();
    if (!name || people.includes(name) || !onUpdatePeople) return;
    const next = [...people, name];
    onUpdatePeople(next);
    setNewPersonName("");
    setConfig(c => ({
      ...c,
      personA: c.personA ?? next[0] ?? null,
      personB: c.personB ?? (next.find(p => p !== (c.personA ?? next[0])) ?? null),
    }));
  };

  // derived category list (union of fixed + variable)
  const allCategories = useMemo(() => {
    const s = new Set<string>();
    fixedExpenses.forEach(e => e.item && s.add(e.item));
    variableExpenses.forEach(e => e.category && s.add(e.category));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-PT"));
  }, [fixedExpenses, variableExpenses]);

  // totals
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

    const autoIncome = (p: string) => {
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
    const incA = config.useManualIncome ? config.incomeA : autoIncome(config.personA);
    const incB = config.useManualIncome ? config.incomeB : autoIncome(config.personB);
    const total = paidA + paidB;
    const totalInc = incA + incB;

    let fairA = 0, fairB = 0;
    if (config.mode === "equal") {
      fairA = total / 2; fairB = total / 2;
    } else if (config.mode === "proportional") {
      if (totalInc > 0) { fairA = total * (incA / totalInc); fairB = total * (incB / totalInc); }
      else { fairA = total / 2; fairB = total / 2; }
    } else if (config.mode === "custom") {
      if (config.customKind === "percent") {
        fairA = total * (config.percentA / 100);
        fairB = total * ((100 - config.percentA) / 100);
      } else {
        fairA = config.fixedA;
        fairB = config.fixedB;
      }
    } else if (config.mode === "category") {
      // fair share by category ownership across ALL expenses (paid or not)
      const catTotal: Record<string, number> = {};
      fixedExpenses.forEach(e => {
        const v = e.monthlyValues[selectedMonth] ?? 0;
        if (!v) return;
        catTotal[e.category] = (catTotal[e.category] ?? 0) + v;
      });
      variableExpenses
        .filter(e => isDateInMonth(e.date, selectedMonth))
        .forEach(e => { catTotal[e.category] = (catTotal[e.category] ?? 0) + e.value; });
      Object.entries(catTotal).forEach(([cat, v]) => {
        const owner = config.categoryOwner[cat];
        if (owner === "A") fairA += v;
        else if (owner === "B") fairB += v;
        else { fairA += v / 2; fairB += v / 2; }
      });
    }

    const diff = paidA - fairA;
    return { paidA, paidB, incA, incB, total, totalInc, fairA, fairB, diff };
  }, [config, fixedExpenses, variableExpenses, incomes, salaryConfigs, selectedMonth]);

  // ============ EMPTY STATE ============
  if (!config.enabled && !editing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500/15 to-pink-500/5 text-pink-600 flex items-center justify-center">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-foreground leading-tight">Modo Casal</h3>
            <p className="text-xs text-text-muted">Divisão inteligente entre duas pessoas</p>
          </div>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Escolha entre 4 modos de divisão — igual, proporcional, personalizado ou por categorias.
        </p>
        <button
          onClick={() => setEditing(true)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {people.length < 2 ? "Configurar (adicionar pessoas) →" : "Ativar Modo Casal →"}
        </button>
      </motion.div>
    );
  }

  // ============ EDITOR ============
  if (editing) {
    const canSave = !!config.personA && !!config.personB && config.personA !== config.personB;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-foreground">Configurar Modo Casal</h3>
          <button onClick={() => setEditing(false)} className="text-text-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* People */}
        <div>
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Pessoas</label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {(["personA", "personB"] as const).map((k, i) => (
              <div key={k}>
                <p className="text-xs text-text-muted mb-1">Pessoa {i + 1}</p>
                <select
                  value={config[k] || ""}
                  onChange={(e) => setConfig({ ...config, [k]: e.target.value })}
                  className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5"
                >
                  <option value="">—</option>
                  {people.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            ))}
          </div>

          {onUpdatePeople && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPerson(); } }}
                placeholder="Adicionar pessoa"
                className="flex-1 text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5"
              />
              <button
                type="button"
                onClick={addPerson}
                disabled={!newPersonName.trim() || people.includes(newPersonName.trim())}
                className="px-3 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>
          )}
        </div>

        {/* Mode cards */}
        <div>
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Modo de Divisão</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {(Object.keys(MODE_META) as SplitMode[]).map(key => {
              const meta = MODE_META[key];
              const Icon = meta.icon;
              const active = config.mode === key;
              return (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfig({ ...config, mode: key })}
                  className={`relative p-4 rounded-2xl border text-left transition-all ${
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border-subtle bg-background hover:bg-surface-hover"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center mb-2.5`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{meta.title}</p>
                  <p className="text-[11px] text-text-muted leading-snug mt-0.5">{meta.desc}</p>
                  {active && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Mode-specific config */}
        <AnimatePresence mode="wait">
          {config.mode === "proportional" && (
            <motion.div
              key="prop"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="p-4 rounded-2xl bg-background border border-border-subtle/60 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Rendimento mensal</p>
                <label className="text-xs text-text-muted flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.useManualIncome}
                    onChange={(e) => setConfig({ ...config, useManualIncome: e.target.checked })}
                    className="rounded"
                  />
                  Definir manualmente
                </label>
              </div>
              {config.useManualIncome ? (
                <div className="grid grid-cols-2 gap-3">
                  {(["A", "B"] as const).map(side => {
                    const p = side === "A" ? config.personA : config.personB;
                    const value = side === "A" ? config.incomeA : config.incomeB;
                    return (
                      <div key={side}>
                        <p className="text-xs text-text-muted mb-1">{p || `Pessoa ${side}`}</p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">€</span>
                          <input
                            type="number" min="0" step="0.01" value={value || ""}
                            onChange={(e) => setConfig({
                              ...config,
                              [side === "A" ? "incomeA" : "incomeB"]: parseFloat(e.target.value) || 0,
                            })}
                            className="w-full text-sm bg-surface border border-border-subtle rounded-xl pl-7 pr-3 py-2.5 tabular-nums"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted">Vamos usar os rendimentos registados no mês selecionado.</p>
              )}
            </motion.div>
          )}

          {config.mode === "custom" && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="p-4 rounded-2xl bg-background border border-border-subtle/60 space-y-3"
            >
              <div className="flex gap-2">
                {(["percent", "fixed"] as CustomKind[]).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setConfig({ ...config, customKind: k })}
                    className={`flex-1 text-xs font-semibold py-2 rounded-xl transition-colors ${
                      config.customKind === k
                        ? "bg-foreground text-background"
                        : "bg-surface text-text-muted border border-border-subtle"
                    }`}
                  >
                    {k === "percent" ? "Por percentagem" : "Contribuição fixa"}
                  </button>
                ))}
              </div>

              {config.customKind === "percent" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{config.personA || "Pessoa 1"}</span>
                    <span>{config.personB || "Pessoa 2"}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={config.percentA}
                    onChange={(e) => setConfig({ ...config, percentA: parseInt(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <div className="flex items-center justify-between font-mono text-sm font-bold text-foreground">
                    <span>{config.percentA}%</span>
                    <span>{100 - config.percentA}%</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(["A", "B"] as const).map(side => {
                    const p = side === "A" ? config.personA : config.personB;
                    const value = side === "A" ? config.fixedA : config.fixedB;
                    return (
                      <div key={side}>
                        <p className="text-xs text-text-muted mb-1">{p || `Pessoa ${side}`}</p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">€</span>
                          <input
                            type="number" min="0" step="0.01" value={value || ""}
                            onChange={(e) => setConfig({
                              ...config,
                              [side === "A" ? "fixedA" : "fixedB"]: parseFloat(e.target.value) || 0,
                            })}
                            className="w-full text-sm bg-surface border border-border-subtle rounded-xl pl-7 pr-3 py-2.5 tabular-nums"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {config.mode === "category" && (
            <motion.div
              key="cat"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="p-4 rounded-2xl bg-background border border-border-subtle/60 space-y-3"
            >
              <p className="text-xs text-text-muted">
                Atribua cada categoria à pessoa responsável. Categorias não atribuídas são divididas 50/50.
              </p>
              {allCategories.length === 0 ? (
                <p className="text-sm text-text-muted italic">Ainda não existem categorias.</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {allCategories.map(cat => {
                    const owner = config.categoryOwner[cat];
                    const set = (v: "A" | "B" | null) => {
                      const next = { ...config.categoryOwner };
                      if (v === null) delete next[cat]; else next[cat] = v;
                      setConfig({ ...config, categoryOwner: next });
                    };
                    return (
                      <div key={cat} className="flex items-center justify-between gap-2 py-1.5">
                        <span className="text-sm text-foreground truncate flex-1">{cat}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => set(owner === "A" ? null : "A")}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                              owner === "A"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-surface text-text-muted border-border-subtle hover:text-foreground"
                            }`}
                          >
                            {config.personA || "P1"}
                          </button>
                          <button
                            type="button"
                            onClick={() => set(owner === "B" ? null : "B")}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                              owner === "B"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-surface text-text-muted border-border-subtle hover:text-foreground"
                            }`}
                          >
                            {config.personB || "P2"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Learning placeholder (future) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-500/5 to-transparent border border-dashed border-violet-500/30">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">Aprendizagem Inteligente <span className="text-[10px] font-normal text-text-muted ml-1">em breve</span></p>
              <p className="text-[11px] text-text-muted leading-snug mt-0.5">
                A IA vai analisar padrões de pagamento e sugerir regras automaticamente.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { persist({ ...config, enabled: true }); setEditing(false); }}
            disabled={!canSave}
            className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40"
          >
            Guardar
          </button>
          {config.enabled && (
            <button
              onClick={() => { persist({ ...config, enabled: false }); setEditing(false); }}
              className="text-sm text-text-muted px-4 hover:text-foreground"
            >
              Desativar
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // ============ ACTIVE VIEW ============
  if (!totals || !config.personA || !config.personB) return null;
  const whoOwes = totals.diff > 0.01 ? config.personB : totals.diff < -0.01 ? config.personA : null;
  const whoReceives = whoOwes === config.personA ? config.personB : config.personA;
  const owedAmount = Math.abs(totals.diff);
  const currentMeta = MODE_META[config.mode];
  const CurrentIcon = currentMeta.icon;

  // Rules card content
  const catsByOwner = (side: "A" | "B") =>
    Object.entries(config.categoryOwner).filter(([, o]) => o === side).map(([c]) => c);

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500/15 to-pink-500/5 text-pink-600 flex items-center justify-center">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground leading-tight">Modo Casal</h3>
              <p className="text-xs text-text-muted flex items-center gap-1.5">
                <CurrentIcon className="h-3 w-3" /> {currentMeta.title}
              </p>
            </div>
          </div>
          <button onClick={() => setEditing(true)} className="text-text-muted hover:text-foreground p-1.5">
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
              <div className="mt-2.5 space-y-2">
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wide">Rendimento</p>
                  <p className="font-mono text-sm font-semibold text-status-paid tabular-nums">{fmt(inc)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wide">Pagou</p>
                  <p className="font-display text-lg font-bold tabular-nums">{fmt(paid)}</p>
                  <p className="text-[10px] text-text-muted">
                    quota: {fmt(fair)}{" "}
                    {Math.abs(paid - fair) > 0.005 && (
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

        <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/15">
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

      {/* Rules card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-600 flex items-center justify-center">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground leading-tight">Regras da Casa</h3>
              <p className="text-xs text-text-muted">Resumo da configuração</p>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border-subtle/60">
            <span className="text-xs text-text-muted uppercase tracking-wide">Modo</span>
            <span className="text-sm font-semibold text-foreground">{currentMeta.title}</span>
          </div>

          {config.mode === "equal" && (
            <div className="grid grid-cols-2 gap-3">
              {[config.personA, config.personB].map(p => (
                <div key={p!} className="p-3 rounded-xl bg-background border border-border-subtle/60">
                  <PersonBadge person={p} people={people} />
                  <p className="font-mono text-lg font-bold text-foreground mt-1.5">50%</p>
                </div>
              ))}
            </div>
          )}

          {config.mode === "proportional" && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { p: config.personA, inc: totals.incA },
                { p: config.personB, inc: totals.incB },
              ].map(({ p, inc }) => {
                const pct = totals.totalInc > 0 ? (inc / totals.totalInc) * 100 : 50;
                return (
                  <div key={p!} className="p-3 rounded-xl bg-background border border-border-subtle/60">
                    <PersonBadge person={p} people={people} />
                    <p className="font-mono text-lg font-bold text-foreground mt-1.5">{pct.toFixed(0)}%</p>
                    <p className="text-[10px] text-text-muted tabular-nums">{fmt(inc)}/mês</p>
                  </div>
                );
              })}
            </div>
          )}

          {config.mode === "custom" && config.customKind === "percent" && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { p: config.personA, v: config.percentA },
                { p: config.personB, v: 100 - config.percentA },
              ].map(({ p, v }) => (
                <div key={p!} className="p-3 rounded-xl bg-background border border-border-subtle/60">
                  <PersonBadge person={p} people={people} />
                  <p className="font-mono text-lg font-bold text-foreground mt-1.5">{v}%</p>
                </div>
              ))}
            </div>
          )}

          {config.mode === "custom" && config.customKind === "fixed" && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { p: config.personA, v: config.fixedA },
                { p: config.personB, v: config.fixedB },
              ].map(({ p, v }) => (
                <div key={p!} className="p-3 rounded-xl bg-background border border-border-subtle/60">
                  <PersonBadge person={p} people={people} />
                  <p className="font-mono text-lg font-bold text-foreground mt-1.5 tabular-nums">{fmt(v)}</p>
                </div>
              ))}
            </div>
          )}

          {config.mode === "category" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["A", "B"] as const).map(side => {
                const p = side === "A" ? config.personA : config.personB;
                const cats = catsByOwner(side);
                return (
                  <div key={side} className="p-3 rounded-xl bg-background border border-border-subtle/60">
                    <PersonBadge person={p} people={people} />
                    <p className="text-xs text-text-muted mt-1.5">
                      {cats.length === 0
                        ? <span className="italic">Sem categorias atribuídas</span>
                        : cats.join(" • ")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
