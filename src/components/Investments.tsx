import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import type { Investment } from "@/types/investment";
import { INVESTMENT_TYPE_LABELS } from "@/types/investment";
import type { Account } from "@/types/account";

interface InvestmentsProps {
  investments: Investment[];
  accounts: Account[];
  selectedMonth: number;
  onAdd: (investment: Omit<Investment, "id">) => void;
  onUpdate: (id: string, updates: Partial<Investment>) => void;
  onDelete: (id: string) => void;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

export const Investments = ({ investments, accounts, selectedMonth, onAdd, onUpdate, onDelete }: InvestmentsProps) => {
  const [showForm, setShowForm] = useState(false);
  const [newInv, setNewInv] = useState({
    type: "poupanca" as Investment["type"], account: "", value: "", date: "", returns: "", description: "",
  });

  const monthInvestments = investments.filter(i => new Date(i.date).getMonth() === selectedMonth);
  const totalInvested = monthInvestments.reduce((s, i) => s + i.value, 0);
  const totalReturns = monthInvestments.reduce((s, i) => s + (i.returns ?? 0), 0);

  const handleAdd = () => {
    const val = parseFloat(newInv.value.replace(",", "."));
    if (isNaN(val)) return;
    const ret = newInv.returns ? parseFloat(newInv.returns.replace(",", ".")) : null;
    const year = new Date().getFullYear();
    const date = newInv.date || new Date(year, selectedMonth, 15).toISOString().split("T")[0];
    onAdd({
      type: newInv.type, account: newInv.account, value: val,
      date, returns: isNaN(ret as number) ? null : ret,
      description: newInv.description || INVESTMENT_TYPE_LABELS[newInv.type],
    });
    setNewInv({ type: "poupanca", account: "", value: "", date: "", returns: "", description: "" });
    setShowForm(false);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Investimentos</h2>
          <p className="text-sm text-text-muted mt-0.5">{monthInvestments.length} registros este mês</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="label-caps">Total Investido</span>
            <p className="text-xl font-semibold text-primary font-mono tabular-nums tracking-tight">{fmt(totalInvested)}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo Investimento</span>
          </button>
        </div>
      </div>

      <div className="sm:hidden mb-4 text-right">
        <span className="label-caps">Total Investido</span>
        <p className="text-xl font-semibold text-primary font-mono tabular-nums tracking-tight">{fmt(totalInvested)}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(["acoes", "poupanca", "cripto"] as const).map(type => {
          const typeTotal = monthInvestments.filter(i => i.type === type).reduce((s, i) => s + i.value, 0);
          return (
            <div key={type} className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
              <span className="label-caps">{INVESTMENT_TYPE_LABELS[type]}</span>
              <p className="text-lg font-semibold text-foreground font-mono tabular-nums mt-1">{fmt(typeTotal)}</p>
            </div>
          );
        })}
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Tipo</label>
              <select value={newInv.type} onChange={(e) => setNewInv({ ...newInv, type: e.target.value as Investment["type"] })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="acoes">Ações</option>
                <option value="poupanca">Poupança</option>
                <option value="cripto">Cripto</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Conta</label>
              <select value={newInv.account} onChange={(e) => setNewInv({ ...newInv, account: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">—</option>
                {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Valor (€)</label>
              <input value={newInv.value} onChange={(e) => setNewInv({ ...newInv, value: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Data</label>
              <input type="date" value={newInv.date} onChange={(e) => setNewInv({ ...newInv, date: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Rentabilidade (€)</label>
              <input value={newInv.returns} onChange={(e) => setNewInv({ ...newInv, returns: e.target.value })}
                placeholder="Opcional"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button onClick={handleAdd} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Adicionar</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">✕</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Desktop header */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 mb-1">
        <span className="col-span-2 label-caps">Tipo</span>
        <span className="col-span-2 label-caps">Conta</span>
        <span className="col-span-2 label-caps text-right">Valor</span>
        <span className="col-span-2 label-caps">Data</span>
        <span className="col-span-2 label-caps text-right">Rentabilidade</span>
        <span className="col-span-2"></span>
      </div>

      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 divide-y divide-border-subtle/40">
        {monthInvestments.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-muted">
            Nenhum investimento neste mês.
          </div>
        ) : monthInvestments.map(inv => (
          <div key={inv.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
            <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  inv.type === "acoes" ? "bg-blue-500/10 text-blue-600" :
                  inv.type === "cripto" ? "bg-purple-500/10 text-purple-600" :
                  "bg-emerald-500/10 text-emerald-600"
                }`}>{INVESTMENT_TYPE_LABELS[inv.type]}</span>
              </div>
              <div className="col-span-2 text-sm text-text-muted">{inv.account || "—"}</div>
              <div className="col-span-2 text-right font-mono text-sm text-foreground tabular-nums font-semibold">{fmt(inv.value)}</div>
              <div className="col-span-2 text-sm text-text-muted">
                {new Date(inv.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
              </div>
              <div className="col-span-2 text-right">
                {inv.returns != null ? (
                  <span className={`font-mono text-sm tabular-nums ${inv.returns >= 0 ? "text-status-paid" : "text-status-negative"}`}>
                    {inv.returns >= 0 ? "+" : ""}{fmt(inv.returns)}
                  </span>
                ) : <span className="text-xs text-text-muted">—</span>}
              </div>
              <div className="col-span-2 text-right">
                <button onClick={() => onDelete(inv.id)} className="text-text-muted hover:text-status-negative transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile */}
            <div className="sm:hidden space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    inv.type === "acoes" ? "bg-blue-500/10 text-blue-600" :
                    inv.type === "cripto" ? "bg-purple-500/10 text-purple-600" :
                    "bg-emerald-500/10 text-emerald-600"
                  }`}>{INVESTMENT_TYPE_LABELS[inv.type]}</span>
                  <span className="text-sm font-semibold text-foreground">{inv.description}</span>
                </div>
                <button onClick={() => onDelete(inv.id)} className="text-text-muted hover:text-status-negative transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{new Date(inv.date).toLocaleDateString("pt-PT")}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-foreground tabular-nums font-semibold">{fmt(inv.value)}</span>
                  {inv.returns != null && (
                    <span className={`font-mono text-xs tabular-nums ${inv.returns >= 0 ? "text-status-paid" : "text-status-negative"}`}>
                      {inv.returns >= 0 ? "+" : ""}{fmt(inv.returns)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
