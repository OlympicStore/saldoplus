import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Plus, Trash2, Pencil, TrendingUp, TrendingDown, Minus, Sparkles,
  LineChart as LineChartIcon, Wallet, PiggyBank, Percent, MoreHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import type { Investment, InvestmentType } from "@/types/investment";
import { INVESTMENT_TYPE_LABELS, INVESTMENT_TYPE_COLORS } from "@/types/investment";
import type { Account } from "@/types/account";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface InvestmentsProps {
  investments: Investment[];
  accounts: Account[];
  selectedMonth: number;
  onAdd: (investment: Omit<Investment, "id">) => void;
  onUpdate: (id: string, updates: Partial<Investment>) => void;
  onDelete: (id: string) => void;
}

const fmt = (v: number) =>
  `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const MONTH_NAMES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

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

const emptyForm = {
  type: "" as string,
  customType: "",
  name: "",
  account: "",
  value: "",
  currentValue: "",
  date: "",
};

export const Investments = ({ investments, accounts, onAdd, onUpdate, onDelete }: InvestmentsProps) => {
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // ============ TOTAIS PORTFÓLIO ============
  const portfolio = useMemo(() => {
    const totalInvested = investments.reduce((s, i) => s + i.value, 0);
    // Se sem valor atual, usa valor investido (per requirement)
    const totalCurrent = investments.reduce((s, i) => s + (i.currentValue ?? i.value), 0);
    const profit = totalCurrent - totalInvested;
    const avgReturn = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    return { totalInvested, totalCurrent, profit, avgReturn };
  }, [investments]);

  // ============ EVOLUÇÃO (acumulado por mês) ============
  const evolutionData = useMemo(() => {
    if (investments.length === 0) return [];
    const sorted = [...investments].sort((a, b) => a.date.localeCompare(b.date));
    const buckets = new Map<string, { invested: number; current: number }>();
    sorted.forEach((i) => {
      const d = new Date(i.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = buckets.get(key) || { invested: 0, current: 0 };
      b.invested += i.value;
      b.current += i.currentValue ?? i.value;
      buckets.set(key, b);
    });
    let accInvested = 0, accCurrent = 0;
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, b]) => {
        accInvested += b.invested;
        accCurrent += b.current;
        const [year, month] = key.split("-");
        return {
          label: `${MONTH_NAMES_SHORT[Number(month) - 1]}/${year.slice(2)}`,
          patrimonio: Math.round(accCurrent * 100) / 100,
          investido: Math.round(accInvested * 100) / 100,
        };
      });
  }, [investments]);

  // ============ FORM ============
  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
    setOpenForm(true);
  };

  const openEdit = (inv: Investment) => {
    setEditingId(inv.id);
    const isKnown = ["acoes","etf","cripto","fundos","poupanca","outros"].includes(inv.type);
    setForm({
      type: isKnown ? inv.type : "__custom",
      customType: isKnown ? "" : inv.type,
      name: inv.name || "",
      account: inv.account || "",
      value: String(inv.value).replace(".", ","),
      currentValue: inv.currentValue != null ? String(inv.currentValue).replace(".", ",") : "",
      date: inv.date || new Date().toISOString().split("T")[0],
    });
    setOpenForm(true);
  };

  const handleSave = () => {
    const val = parseFloat(form.value.replace(",", "."));
    const finalType = form.type === "__custom" ? form.customType.trim() : form.type;
    if (isNaN(val) || !finalType || !form.name.trim()) return;
    const cvRaw = form.currentValue.trim();
    const cv = cvRaw ? parseFloat(cvRaw.replace(",", ".")) : NaN;
    const date = form.date || new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    if (editingId) {
      onUpdate(editingId, {
        type: finalType as InvestmentType,
        name: form.name.trim(),
        account: form.account,
        value: val,
        date,
        currentValue: !isNaN(cv) ? cv : null,
        currentValueUpdatedAt: !isNaN(cv) ? now : null,
      });
    } else {
      onAdd({
        type: finalType as InvestmentType,
        name: form.name.trim(),
        account: form.account,
        value: val,
        date,
        returns: null,
        currentValue: !isNaN(cv) ? cv : null,
        currentValueUpdatedAt: !isNaN(cv) ? now : null,
        description: form.name.trim(),
      });
    }
    setOpenForm(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const confirmDelete = () => {
    if (deletingId) onDelete(deletingId);
    setDeletingId(null);
  };

  // ============ EMPTY STATE ============
  if (investments.length === 0) {
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto text-center py-16 px-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6">
            <LineChartIcon className="h-9 w-9 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-3">
            Ainda não tens investimentos registados
          </h2>
          <p className="text-sm text-text-muted mb-8 leading-relaxed">
            Acompanha ações, ETFs, criptomoedas e outros ativos num único lugar.
            Vê a evolução do teu património ao longo do tempo.
          </p>
          <Button onClick={openNew} size="lg" className="rounded-2xl px-6">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar investimento
          </Button>

          <div className="mt-10 p-4 rounded-2xl bg-primary/5 border border-primary/15 text-left">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Dica</p>
                <p className="text-xs text-text-muted mt-1">
                  Também podes adicionar investimentos através do Assistente. Ex:{" "}
                  <span className="italic">"Comprei 300€ de Bitcoin."</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {renderFormDialog()}
      </>
    );
  }

  // ============ MAIN ============
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground tracking-tight">
            Património
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {investments.length} {investments.length === 1 ? "ativo" : "ativos"} no portfólio
          </p>
        </div>
        <Button onClick={openNew} className="rounded-2xl">
          <Plus className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Novo investimento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Total investido"
          value={fmt(portfolio.totalInvested)} />
        <StatCard icon={<PiggyBank className="h-4 w-4" />} label="Valor atual"
          value={fmt(portfolio.totalCurrent)} />
        <StatCard
          icon={portfolio.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          label="Lucro / Prejuízo"
          value={`${portfolio.profit >= 0 ? "+" : ""}${fmt(portfolio.profit)}`}
          tone={portfolio.profit > 0 ? "positive" : portfolio.profit < 0 ? "negative" : "neutral"}
        />
        <StatCard
          icon={<Percent className="h-4 w-4" />}
          label="Rentabilidade"
          value={fmtPct(portfolio.avgReturn)}
          tone={portfolio.avgReturn > 0 ? "positive" : portfolio.avgReturn < 0 ? "negative" : "neutral"}
        />
      </div>

      {/* GRÁFICO EVOLUÇÃO */}
      {evolutionData.length > 1 && (
        <div className="bg-surface rounded-3xl border border-border-subtle/60 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Evolução do património</h3>
              <p className="text-xs text-text-muted mt-0.5">Acumulado ao longo do tempo</p>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="patrimonio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any, n: string) => [fmt(Number(v)), n === "patrimonio" ? "Património" : "Investido"]}
                />
                <Area type="monotone" dataKey="patrimonio" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#patrimonio)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* LISTA DE ATIVOS */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 px-1">Os teus ativos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {investments
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((inv) => {
              const hasCurrent = inv.currentValue != null;
              const currentValue = inv.currentValue ?? inv.value;
              const profit = currentValue - inv.value;
              const profitPct = inv.value > 0 ? (profit / inv.value) * 100 : 0;

              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group bg-surface rounded-3xl border border-border-subtle/60 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mb-2 ${typeBadgeClass(inv.type)}`}>
                        {INVESTMENT_TYPE_LABELS[inv.type] || inv.type}
                      </span>
                      <p className="font-display text-lg font-semibold text-foreground truncate">
                        {inv.name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {inv.account || "Sem conta"} · {new Date(inv.date).toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(inv)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                        aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeletingId(inv.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-status-negative hover:bg-surface-hover transition-colors"
                        aria-label="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-subtle/60">
                    <div>
                      <span className="label-caps block">Investido</span>
                      <p className="font-mono text-sm text-foreground tabular-nums font-semibold mt-1">
                        {fmt(inv.value)}
                      </p>
                    </div>
                    <div>
                      <span className="label-caps block">Valor atual</span>
                      <p className="font-mono text-sm text-foreground tabular-nums font-semibold mt-1">
                        {fmt(currentValue)}
                      </p>
                    </div>
                  </div>

                  {hasCurrent && (
                    <div className={`mt-3 flex items-center gap-1 text-sm font-mono tabular-nums font-semibold ${
                      profit > 0 ? "text-status-paid" : profit < 0 ? "text-status-negative" : "text-text-muted"
                    }`}>
                      {profit > 0 ? <TrendingUp className="h-3.5 w-3.5" /> :
                       profit < 0 ? <TrendingDown className="h-3.5 w-3.5" /> :
                       <Minus className="h-3.5 w-3.5" />}
                      <span>{fmtPct(profitPct)}</span>
                      <span className="text-text-muted font-normal ml-1">
                        ({profit >= 0 ? "+" : ""}{fmt(profit)})
                      </span>
                    </div>
                  )}

                  {!hasCurrent && (
                    <button onClick={() => openEdit(inv)}
                      className="mt-3 text-xs text-primary hover:underline">
                      Adicionar valor atual
                    </button>
                  )}
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* AI HINT */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Dica</p>
            <p className="text-xs text-text-muted mt-1">
              Também podes adicionar investimentos diretamente através do Assistente. Ex:{" "}
              <span className="italic">"Comprei 300€ de Bitcoin."</span>
            </p>
          </div>
        </div>
      </div>

      {renderFormDialog()}

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar investimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-status-negative text-white hover:bg-status-negative/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );

  // ============ FORM DIALOG ============
  function renderFormDialog() {
    return (
      <Dialog open={openForm} onOpenChange={(o) => { setOpenForm(o); if (!o) { setForm(emptyForm); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingId ? "Editar investimento" : "Novo investimento"}
            </DialogTitle>
            <DialogDescription>
              Regista um ativo do teu portfólio. Podes atualizar o valor atual mais tarde.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Tipo *</Label>
              <Select value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v, customType: v === "__custom" ? form.customType : "" })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acoes">Ações</SelectItem>
                  <SelectItem value="etf">ETFs</SelectItem>
                  <SelectItem value="cripto">Cripto</SelectItem>
                  <SelectItem value="fundos">Fundos</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                  <SelectItem value="__custom">+ Novo tipo…</SelectItem>
                </SelectContent>
              </Select>
              {form.type === "__custom" && (
                <Input className="mt-2 rounded-xl" placeholder="Ex: P2P, Obrigações"
                  value={form.customType}
                  onChange={(e) => setForm({ ...form, customType: e.target.value })} />
              )}
            </div>

            <div>
              <Label className="text-xs">Nome do ativo *</Label>
              <Input className="mt-1.5 rounded-xl" placeholder="Ex: Bitcoin, S&P 500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <Label className="text-xs">Valor investido (€) *</Label>
              <Input className="mt-1.5 rounded-xl font-mono text-right" placeholder="0,00"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>

            <details className="group">
              <summary className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer hover:text-foreground transition-colors list-none">
                <MoreHorizontal className="h-3.5 w-3.5" />
                Opções adicionais
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <Label className="text-xs">Conta</Label>
                  <Select value={form.account || "__none"}
                    onValueChange={(v) => setForm({ ...form, account: v === "__none" ? "" : v })}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input type="date" className="mt-1.5 rounded-xl"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Valor atual (€)</Label>
                  <Input className="mt-1.5 rounded-xl font-mono text-right"
                    placeholder="Opcional — usa o valor investido se vazio"
                    value={form.currentValue}
                    onChange={(e) => setForm({ ...form, currentValue: e.target.value })} />
                </div>
              </div>
            </details>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpenForm(false); setForm(emptyForm); setEditingId(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="rounded-xl">
              {editingId ? "Guardar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
};

// ============ StatCard ============
function StatCard({
  icon, label, value, tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive" ? "text-status-paid" :
    tone === "negative" ? "text-status-negative" :
    "text-foreground";
  return (
    <div className="bg-surface rounded-3xl border border-border-subtle/60 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-1.5 text-text-muted mb-2">
        {icon}
        <span className="label-caps">{label}</span>
      </div>
      <p className={`font-display text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
