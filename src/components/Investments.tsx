import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, Minus, Sparkles, Check, X } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import type { Investment, InvestmentType } from "@/types/investment";
import { INVESTMENT_TYPE_LABELS, INVESTMENT_TYPE_COLORS } from "@/types/investment";
import type { Account } from "@/types/account";

interface InvestmentsProps {
  investments: Investment[];
  accounts: Account[];
  selectedMonth: number;
  onAdd: (investment: Omit<Investment, "id">) => void;
  onUpdate: (id: string, updates: Partial<Investment>) => void;
  onDelete: (id: string) => void;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const MONTH_NAMES_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const TYPE_HSL: Record<string, string> = {
  acoes: "hsl(217 91% 60%)",
  etf: "hsl(239 84% 67%)",
  cripto: "hsl(271 91% 65%)",
  fundos: "hsl(38 92% 50%)",
  poupanca: "hsl(160 84% 39%)",
  outros: "hsl(215 16% 47%)",
};

const typeBadgeClass = (type: string) => {
  const color = INVESTMENT_TYPE_COLORS[type] || "slate";
  const map: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600",
    indigo: "bg-indigo-500/10 text-indigo-600",
    purple: "bg-purple-500/10 text-purple-600",
    amber: "bg-amber-500/10 text-amber-700",
    emerald: "bg-emerald-500/10 text-emerald-600",
    slate: "bg-slate-500/10 text-slate-600",
  };
  return map[color] || map.slate;
};

export const Investments = ({ investments, accounts, onAdd, onUpdate, onDelete }: InvestmentsProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editingValueInput, setEditingValueInput] = useState("");
  const [sortBy, setSortBy] = useState<"value" | "performance" | "date">("date");
  const [newInv, setNewInv] = useState({
    type: "" as string, customType: "", name: "", account: "",
    value: "", currentValue: "", date: "", description: "",
  });

  // ============ TOTAIS PORTFÓLIO ============
  const portfolio = useMemo(() => {
    const totalInvested = investments.reduce((s, i) => s + i.value, 0);
    const withCurrent = investments.filter(i => i.currentValue != null);
    const totalCurrent = withCurrent.reduce((s, i) => s + (i.currentValue || 0), 0);
    const investedWithCurrent = withCurrent.reduce((s, i) => s + i.value, 0);
    const profit = totalCurrent - investedWithCurrent;
    const avgReturn = investedWithCurrent > 0 ? (profit / investedWithCurrent) * 100 : 0;
    const coveragePct = totalInvested > 0 ? (investedWithCurrent / totalInvested) * 100 : 0;

    // Distribuição por tipo
    const byType = new Map<string, number>();
    investments.forEach(i => {
      byType.set(i.type, (byType.get(i.type) || 0) + i.value);
    });
    const distribution = Array.from(byType.entries())
      .map(([type, value]) => ({ type, value, pct: totalInvested > 0 ? (value / totalInvested) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    return { totalInvested, totalCurrent, profit, avgReturn, hasCurrent: withCurrent.length > 0, coveragePct, distribution };
  }, [investments]);

  // ============ EVOLUÇÃO MENSAL (acumulado) ============
  const evolutionData = useMemo(() => {
    if (investments.length === 0) return [];
    const sorted = [...investments].sort((a, b) => a.date.localeCompare(b.date));
    const buckets = new Map<string, { invested: number; current: number; hasCurrent: boolean }>();
    sorted.forEach(i => {
      const d = new Date(i.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = buckets.get(key) || { invested: 0, current: 0, hasCurrent: false };
      b.invested += i.value;
      if (i.currentValue != null) {
        b.current += i.currentValue;
        b.hasCurrent = true;
      } else {
        b.current += i.value; // assume break-even se não há valor atual
      }
      buckets.set(key, b);
    });
    let accInvested = 0, accCurrent = 0;
    let hasAnyCurrent = false;
    const arr = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, b]) => {
      accInvested += b.invested;
      accCurrent += b.current;
      if (b.hasCurrent) hasAnyCurrent = true;
      const [year, month] = key.split("-");
      return {
        label: `${MONTH_NAMES_SHORT[Number(month) - 1]}/${year.slice(2)}`,
        invested: Math.round(accInvested * 100) / 100,
        current: hasAnyCurrent ? Math.round(accCurrent * 100) / 100 : null,
      };
    });
    return arr;
  }, [investments]);

  const showCurrentLine = portfolio.hasCurrent;

  // ============ INSIGHTS AUTOMÁTICOS ============
  const insights = useMemo(() => {
    const items: { tone: "info" | "good" | "warn"; text: string }[] = [];
    if (portfolio.totalInvested === 0) return items;

    items.push({
      tone: "info",
      text: `Já investiu ${fmt(portfolio.totalInvested)} ao longo do tempo${investments.length > 1 ? ` em ${investments.length} aportes` : ""}.`,
    });

    if (portfolio.distribution.length > 0) {
      const top = portfolio.distribution[0];
      if (top.pct >= 60 && portfolio.distribution.length > 1) {
        items.push({
          tone: "warn",
          text: `${top.pct.toFixed(0)}% do seu portfólio está em ${INVESTMENT_TYPE_LABELS[top.type] || top.type}. Considere diversificar.`,
        });
      } else if (portfolio.distribution.length === 1 && portfolio.totalInvested > 500) {
        items.push({
          tone: "warn",
          text: `O seu portfólio só tem 1 tipo de ativo. Diversificar reduz risco.`,
        });
      } else if (portfolio.distribution.length >= 3) {
        items.push({ tone: "good", text: `Portfólio diversificado: ${portfolio.distribution.length} tipos de ativos.` });
      }
    }

    if (portfolio.hasCurrent) {
      if (portfolio.profit > 0) {
        items.push({ tone: "good", text: `Rentabilidade atual: ${fmtPct(portfolio.avgReturn)} (${fmt(portfolio.profit)} de lucro).` });
      } else if (portfolio.profit < 0) {
        items.push({ tone: "warn", text: `Está em prejuízo de ${fmt(Math.abs(portfolio.profit))} (${fmtPct(portfolio.avgReturn)}).` });
      } else {
        items.push({ tone: "info", text: `O valor atual iguala o investido — break-even.` });
      }
    } else {
      items.push({
        tone: "info",
        text: `Adicione o valor atual aos seus ativos para ver ganhos e perdas.`,
      });
    }

    if (portfolio.hasCurrent && portfolio.coveragePct < 100 && portfolio.coveragePct > 0) {
      items.push({
        tone: "info",
        text: `Apenas ${portfolio.coveragePct.toFixed(0)}% dos ativos têm valor atual. Atualize os restantes para análise completa.`,
      });
    }

    return items;
  }, [portfolio, investments.length]);

  // ============ FORM HANDLERS ============
  const handleAdd = () => {
    const val = parseFloat(newInv.value.replace(",", "."));
    const finalType = newInv.type === "__custom" ? newInv.customType.trim() : newInv.type;
    if (isNaN(val) || !finalType || !newInv.name.trim()) return;
    const cv = newInv.currentValue ? parseFloat(newInv.currentValue.replace(",", ".")) : null;
    const today = new Date();
    const date = newInv.date || today.toISOString().split("T")[0];
    onAdd({
      type: finalType as InvestmentType,
      name: newInv.name.trim(),
      account: newInv.account,
      value: val,
      date,
      returns: null,
      currentValue: cv != null && !isNaN(cv) ? cv : null,
      currentValueUpdatedAt: cv != null && !isNaN(cv) ? today.toISOString() : null,
      description: newInv.description || newInv.name.trim(),
    });
    setNewInv({ type: "", customType: "", name: "", account: "", value: "", currentValue: "", date: "", description: "" });
    setShowForm(false);
  };

  const startEditValue = (inv: Investment) => {
    setEditingValueId(inv.id);
    setEditingValueInput(inv.currentValue != null ? String(inv.currentValue).replace(".", ",") : "");
  };

  const saveEditValue = (inv: Investment) => {
    const v = parseFloat(editingValueInput.replace(",", "."));
    if (isNaN(v)) {
      onUpdate(inv.id, { currentValue: null, currentValueUpdatedAt: null });
    } else {
      onUpdate(inv.id, { currentValue: v, currentValueUpdatedAt: new Date().toISOString() });
    }
    setEditingValueId(null);
    setEditingValueInput("");
  };

  // ============ ORDENAÇÃO ============
  const sortedInvestments = useMemo(() => {
    const arr = [...investments];
    if (sortBy === "value") arr.sort((a, b) => b.value - a.value);
    else if (sortBy === "performance") arr.sort((a, b) => {
      const aPerf = a.currentValue != null && a.value > 0 ? (a.currentValue - a.value) / a.value : -Infinity;
      const bPerf = b.currentValue != null && b.value > 0 ? (b.currentValue - b.value) / b.value : -Infinity;
      return bPerf - aPerf;
    });
    else arr.sort((a, b) => b.date.localeCompare(a.date));
    return arr;
  }, [investments, sortBy]);

  const allTypes = new Set<string>(["acoes", "etf", "cripto", "fundos", "poupanca", "outros"]);
  investments.forEach(i => { if (!allTypes.has(i.type)) allTypes.add(i.type); });

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Investimentos</h2>
          <p className="text-sm text-text-muted mt-0.5">
            {investments.length} {investments.length === 1 ? "ativo" : "ativos"} no portfólio
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo Investimento</span>
        </button>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps">Total Investido</span>
          <p className="text-xl font-semibold text-foreground font-mono tabular-nums mt-1">{fmt(portfolio.totalInvested)}</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps">Valor Atual</span>
          {portfolio.hasCurrent ? (
            <p className="text-xl font-semibold text-foreground font-mono tabular-nums mt-1">{fmt(portfolio.totalCurrent + (portfolio.totalInvested - investments.filter(i => i.currentValue != null).reduce((s, i) => s + i.value, 0)))}</p>
          ) : (
            <p className="text-sm text-text-muted mt-2">Sem dados</p>
          )}
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps">Lucro / Prejuízo</span>
          {portfolio.hasCurrent ? (
            <p className={`text-xl font-semibold font-mono tabular-nums mt-1 ${portfolio.profit >= 0 ? "text-status-paid" : "text-status-negative"}`}>
              {portfolio.profit >= 0 ? "+" : ""}{fmt(portfolio.profit)}
            </p>
          ) : (
            <p className="text-sm text-text-muted mt-2">—</p>
          )}
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps">Rentabilidade</span>
          {portfolio.hasCurrent ? (
            <div className="flex items-center gap-1 mt-1">
              {portfolio.avgReturn > 0 ? <TrendingUp className="h-5 w-5 text-status-paid" /> :
                portfolio.avgReturn < 0 ? <TrendingDown className="h-5 w-5 text-status-negative" /> :
                <Minus className="h-5 w-5 text-text-muted" />}
              <p className={`text-xl font-semibold font-mono tabular-nums ${portfolio.avgReturn >= 0 ? "text-status-paid" : "text-status-negative"}`}>
                {fmtPct(portfolio.avgReturn)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted mt-2">—</p>
          )}
        </div>
      </div>

      {/* CTA quando não há valor atual */}
      {!portfolio.hasCurrent && portfolio.totalInvested > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Já investiu {fmt(portfolio.totalInvested)}. Quer saber quanto vale hoje?</p>
              <p className="text-xs text-text-muted mt-0.5">Clique no valor atual de cada ativo abaixo para o atualizar.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-2">
          {insights.map((ins, idx) => (
            <div key={idx} className={`text-sm px-3 py-2 rounded-lg border ${
              ins.tone === "good" ? "bg-status-paid/5 border-status-paid/20 text-foreground" :
              ins.tone === "warn" ? "bg-amber-500/5 border-amber-500/20 text-foreground" :
              "bg-surface border-border-subtle/60 text-text-secondary"
            }`}>
              {ins.text}
            </div>
          ))}
        </div>
      )}

      {/* GRÁFICOS */}
      {evolutionData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Evolução */}
          <div className="lg:col-span-2 bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Evolução do Investimento</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, name: string) => [fmt(Number(v)), name === "invested" ? "Investido" : "Valor atual"]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => v === "invested" ? "Investido (acumulado)" : "Valor atual"} />
                  <Line type="monotone" dataKey="invested" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  {showCurrentLine && (
                    <Line type="monotone" dataKey="current" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribuição */}
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={portfolio.distribution} dataKey="value" nameKey="type" cx="50%" cy="45%" outerRadius={70} innerRadius={40}>
                    {portfolio.distribution.map((entry) => (
                      <Cell key={entry.type} fill={TYPE_HSL[entry.type] || "hsl(215 16% 47%)"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, _n, props: any) => [`${fmt(Number(v))} (${props.payload.pct.toFixed(1)}%)`, INVESTMENT_TYPE_LABELS[props.payload.type] || props.payload.type]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => INVESTMENT_TYPE_LABELS[v] || v} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* FORM ADICIONAR */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label-caps mb-1.5 block">Tipo *</label>
              <select value={newInv.type}
                onChange={(e) => setNewInv({ ...newInv, type: e.target.value, customType: e.target.value === "__custom" ? newInv.customType : "" })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Selecionar</option>
                <option value="acoes">Ações</option>
                <option value="etf">ETFs</option>
                <option value="cripto">Cripto</option>
                <option value="fundos">Fundos</option>
                <option value="poupanca">Poupança</option>
                <option value="outros">Outros</option>
                <option value="__custom">+ Novo tipo...</option>
              </select>
              {newInv.type === "__custom" && (
                <input value={newInv.customType} onChange={(e) => setNewInv({ ...newInv, customType: e.target.value })}
                  placeholder="Ex: P2P, Obrigações..."
                  className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-1 focus:ring-primary" />
              )}
            </div>
            <div>
              <label className="label-caps mb-1.5 block">Nome do ativo *</label>
              <input value={newInv.name} onChange={(e) => setNewInv({ ...newInv, name: e.target.value })}
                placeholder="Ex: Bitcoin, S&P 500"
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="label-caps mb-1.5 block">Conta</label>
              <select value={newInv.account} onChange={(e) => setNewInv({ ...newInv, account: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">—</option>
                {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-caps mb-1.5 block">Data</label>
              <input type="date" value={newInv.date} onChange={(e) => setNewInv({ ...newInv, date: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="label-caps mb-1.5 block">Valor investido (€) *</label>
              <input value={newInv.value} onChange={(e) => setNewInv({ ...newInv, value: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="label-caps mb-1.5 block">Valor atual (€)</label>
              <input value={newInv.currentValue} onChange={(e) => setNewInv({ ...newInv, currentValue: e.target.value })}
                placeholder="Opcional"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2 lg:col-span-2 flex gap-2 items-end">
              <button onClick={handleAdd}
                className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                Adicionar
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-3 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* LISTA — header + sort */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-semibold text-foreground">Os Meus Ativos</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Ordenar:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-background border border-border-subtle rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="date">Mais recente</option>
            <option value="value">Maior valor</option>
            <option value="performance">Maior retorno</option>
          </select>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 divide-y divide-border-subtle/40">
        {sortedInvestments.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-text-muted">Ainda não tem investimentos registados.</p>
            <p className="text-xs text-text-muted mt-1">Comece por adicionar o primeiro acima.</p>
          </div>
        ) : sortedInvestments.map(inv => {
          const hasCurrent = inv.currentValue != null;
          const profit = hasCurrent ? (inv.currentValue! - inv.value) : 0;
          const profitPct = hasCurrent && inv.value > 0 ? (profit / inv.value) * 100 : 0;
          const isEditing = editingValueId === inv.id;

          return (
            <div key={inv.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
              <div className="grid grid-cols-12 gap-2 items-center">
                {/* Tipo + Nome */}
                <div className="col-span-12 sm:col-span-4 flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${typeBadgeClass(inv.type)}`}>
                    {INVESTMENT_TYPE_LABELS[inv.type] || inv.type}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{inv.name || inv.description || "—"}</p>
                    <p className="text-[11px] text-text-muted truncate">
                      {inv.account || "—"} · {new Date(inv.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Valor investido */}
                <div className="col-span-4 sm:col-span-2 text-left sm:text-right">
                  <span className="label-caps block">Investido</span>
                  <p className="font-mono text-sm text-foreground tabular-nums font-semibold">{fmt(inv.value)}</p>
                </div>

                {/* Valor atual (editável) */}
                <div className="col-span-4 sm:col-span-3 text-left sm:text-right">
                  <span className="label-caps block">Valor atual</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1 justify-end">
                      <input
                        autoFocus
                        value={editingValueInput}
                        onChange={(e) => setEditingValueInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditValue(inv);
                          if (e.key === "Escape") { setEditingValueId(null); setEditingValueInput(""); }
                        }}
                        placeholder="0,00"
                        className="w-24 text-sm font-mono bg-background border border-primary rounded-md px-2 py-1 text-right focus:outline-none"
                      />
                      <button onClick={() => saveEditValue(inv)} className="text-status-paid hover:opacity-80 p-1"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { setEditingValueId(null); setEditingValueInput(""); }} className="text-text-muted hover:opacity-80 p-1"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEditValue(inv)}
                      className="group inline-flex items-center gap-1 hover:text-primary transition-colors">
                      {hasCurrent ? (
                        <span className="font-mono text-sm tabular-nums font-semibold">{fmt(inv.currentValue!)}</span>
                      ) : (
                        <span className="text-xs text-text-muted italic">Adicionar valor</span>
                      )}
                      <Pencil className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>

                {/* Performance */}
                <div className="col-span-3 sm:col-span-2 text-left sm:text-right">
                  <span className="label-caps block">Retorno</span>
                  {hasCurrent ? (
                    <div className={`flex items-center gap-0.5 sm:justify-end ${profit >= 0 ? "text-status-paid" : "text-status-negative"}`}>
                      {profit > 0 ? <TrendingUp className="h-3 w-3" /> : profit < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                      <span className="font-mono text-xs tabular-nums font-semibold">{fmtPct(profitPct)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </div>

                {/* Apagar */}
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => onDelete(inv.id)}
                    className="text-text-muted hover:text-status-negative transition-colors p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Linha lucro absoluto (mobile + desktop quando tem valor) */}
              {hasCurrent && (
                <div className="mt-1 text-right">
                  <span className={`text-[11px] font-mono tabular-nums ${profit >= 0 ? "text-status-paid" : "text-status-negative"}`}>
                    {profit >= 0 ? "+" : ""}{fmt(profit)}
                  </span>
                  {inv.currentValueUpdatedAt && (
                    <span className="text-[10px] text-text-muted ml-2">
                      atualizado {new Date(inv.currentValueUpdatedAt).toLocaleDateString("pt-PT")}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
