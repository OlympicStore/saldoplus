import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRightLeft, Plus, Trash2 } from "lucide-react";
import type { Transfer } from "@/types/transfer";
import type { Account } from "@/types/account";

interface TransfersProps {
  transfers: Transfer[];
  accounts: Account[];
  selectedMonth: number;
  onAdd: (transfer: Omit<Transfer, "id">) => void;
  onDelete: (id: string) => void;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

export const TransfersBetweenAccounts = ({ transfers, accounts, selectedMonth, onAdd, onDelete }: TransfersProps) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ from: "", to: "", value: "", date: "", description: "" });

  const monthTransfers = transfers.filter(t => new Date(t.date).getMonth() === selectedMonth);

  const handleAdd = () => {
    const val = parseFloat(form.value.replace(",", "."));
    if (isNaN(val) || !form.from || !form.to || form.from === form.to) return;
    const year = new Date().getFullYear();
    const date = form.date || new Date(year, selectedMonth, 15).toISOString().split("T")[0];
    onAdd({ from_account: form.from, to_account: form.to, value: val, date, description: form.description });
    setForm({ from: "", to: "", value: "", date: "", description: "" });
    setShowForm(false);
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Transferências entre Contas</h3>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
          <Plus className="h-3.5 w-3.5" />Nova
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">De</label>
              <select value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Selecionar</option>
                {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Para</label>
              <select value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Selecionar</option>
                {accounts.filter(a => a.name !== form.from).map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Valor (€)</label>
              <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Nota</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Opcional"
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button onClick={handleAdd} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Transferir</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">✕</button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 divide-y divide-border-subtle/40">
        {monthTransfers.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-text-muted">
            Nenhuma transferência neste mês.
          </div>
        ) : monthTransfers.map(t => (
          <div key={t.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground">{t.from_account}</span>
                <ArrowRightLeft className="h-3.5 w-3.5 text-text-muted shrink-0" />
                <span className="text-sm font-medium text-foreground">{t.to_account}</span>
                {t.description && <span className="text-xs text-text-muted truncate hidden sm:inline">· {t.description}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">{new Date(t.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}</span>
                <span className="font-mono text-sm font-semibold text-foreground tabular-nums">{fmt(t.value)}</span>
                <button onClick={() => onDelete(t.id)} className="text-text-muted hover:text-status-negative transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
