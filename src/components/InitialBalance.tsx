import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Wallet, Banknote, PiggyBank, Building2, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from "lucide-react";
import type { Account } from "@/types/account";
import type { Income } from "@/types/income";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Investment } from "@/types/investment";
import type { Transfer } from "@/types/transfer";

interface InitialBalanceProps {
  accounts: Account[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  investments: Investment[];
  transfers: Transfer[];
  onAdd: (account: Omit<Account, "id">) => void;
  onUpdate: (id: string, updates: Partial<Account>) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  corrente: "Conta Corrente",
  conjunta: "Conta Conjunta",
  poupanca: "Conta Poupança",
  dinheiro: "Dinheiro Físico",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  corrente: <Wallet className="h-4 w-4" />,
  conjunta: <Building2 className="h-4 w-4" />,
  poupanca: <PiggyBank className="h-4 w-4" />,
  dinheiro: <Banknote className="h-4 w-4" />,
};

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

export const InitialBalance = ({
  accounts, incomes, fixedExpenses, variableExpenses, investments, transfers,
  onAdd, onUpdate, onDelete,
}: InitialBalanceProps) => {
  const [showForm, setShowForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", balance: "", type: "corrente" as Account["type"] });
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const getAccountMovements = (accountName: string) => {
    const incomeItems = incomes.filter(i => i.account === accountName);
    const inTotal = incomeItems.reduce((s, i) => s + i.value, 0);

    const fixedItems = fixedExpenses.filter(e => e.account === accountName);
    const fixedTotal = fixedItems.reduce((s, e) => {
      return s + Object.values(e.monthlyValues).reduce((a, v) => a + (v || 0), 0);
    }, 0);

    const varItems = variableExpenses.filter(e => e.account === accountName);
    const varTotal = varItems.reduce((s, e) => s + e.value, 0);

    const invItems = investments.filter(i => i.account === accountName);
    const invTotal = invItems.reduce((s, i) => s + i.value, 0);

    const transfersInItems = transfers.filter(t => t.to_account === accountName);
    const transfersIn = transfersInItems.reduce((s, t) => s + t.value, 0);

    const transfersOutItems = transfers.filter(t => t.from_account === accountName);
    const transfersOut = transfersOutItems.reduce((s, t) => s + t.value, 0);

    return {
      inTotal: inTotal + transfersIn,
      outTotal: fixedTotal + varTotal + invTotal + transfersOut,
      details: {
        incomeItems, fixedItems, varItems, invItems, transfersInItems, transfersOutItems,
        inTotal, fixedTotal, varTotal, invTotal, transfersIn, transfersOut,
      }
    };
  };

  const totalInitial = accounts.reduce((s, a) => s + a.balance, 0);
  const totalCurrent = accounts.reduce((s, a) => {
    const { inTotal, outTotal } = getAccountMovements(a.name);
    return s + a.balance + inTotal - outTotal;
  }, 0);

  const handleAdd = () => {
    const bal = parseFloat(newAccount.balance.replace(",", "."));
    if (!newAccount.name.trim() || isNaN(bal)) return;
    onAdd({ name: newAccount.name.trim(), balance: bal, type: newAccount.type, sort_order: accounts.length });
    setNewAccount({ name: "", balance: "", type: "corrente" });
    setShowForm(false);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Saldo das Contas</h2>
          <p className="text-sm text-text-muted mt-0.5">Gerencie as suas contas e acompanhe os saldos.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Adicionar Conta</span>
        </button>
      </div>

      {/* Totals - prominent current balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <span className="label-caps text-primary">Saldo Atual Total</span>
          <p className={`text-3xl font-bold font-mono tabular-nums tracking-tight mt-1 ${totalCurrent >= 0 ? "text-foreground" : "text-status-negative"}`}>
            {fmt(totalCurrent)}
          </p>
          <p className="text-xs text-text-muted mt-1">Calculado com base nas movimentações</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps text-text-muted">Saldo Inicial Total</span>
          <p className={`text-lg font-semibold font-mono tabular-nums tracking-tight mt-1 ${totalInitial >= 0 ? "text-foreground" : "text-status-negative"}`}>
            {fmt(totalInitial)}
          </p>
          <p className="text-xs text-text-muted mt-1">Soma dos saldos iniciais</p>
        </div>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="label-caps mb-1.5 block">Nome da Conta</label>
              <input value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="Ex: Santander, Caixa, Revolut"
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-3">
              <label className="label-caps mb-1.5 block">Tipo</label>
              <select value={newAccount.type} onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as Account["type"] })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="corrente">Conta Corrente</option>
                <option value="conjunta">Conta Conjunta</option>
                <option value="poupanca">Conta Poupança</option>
                <option value="dinheiro">Dinheiro Físico</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="label-caps mb-1.5 block">Saldo Inicial (€)</label>
              <input value={newAccount.balance} onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button onClick={handleAdd} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Adicionar</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">✕</button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-3 mb-6">
        {accounts.map((account) => {
          const { inTotal, outTotal, details } = getAccountMovements(account.name);
          const currentBalance = account.balance + inTotal - outTotal;
          const isExpanded = expandedAccount === account.id;

          return (
            <div key={account.id} className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {TYPE_ICONS[account.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <input value={account.name} onChange={(e) => onUpdate(account.id, { name: e.target.value })}
                        className="text-sm font-semibold text-foreground bg-transparent border-none focus:outline-none focus:ring-0 p-0 min-w-0 flex-1" />
                      <span className="text-[10px] text-text-muted bg-secondary px-2 py-0.5 rounded-full shrink-0">
                        {TYPE_LABELS[account.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-text-muted">Inicial:</span>
                      <input
                        type="text"
                        value={account.balance.toFixed(2).replace(".", ",")}
                        onChange={(e) => {
                          const num = parseFloat(e.target.value.replace(",", "."));
                          if (!isNaN(num)) onUpdate(account.id, { balance: num });
                        }}
                        className="w-20 text-xs font-mono text-text-muted bg-transparent border-none focus:outline-none focus:ring-0 p-0 tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className={`text-xl font-bold font-mono tabular-nums ${currentBalance >= 0 ? "text-foreground" : "text-status-negative"}`}>
                        {fmt(currentBalance)}
                      </p>
                    </div>
                    <button onClick={() => onDelete(account.id)} className="text-text-muted hover:text-status-negative transition-colors p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable movements */}
              <button
                onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs text-text-muted hover:text-foreground hover:bg-surface-hover transition-colors border-t border-border-subtle/40"
              >
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {isExpanded ? "Ocultar movimentações" : "Ver movimentações"}
              </button>

              {isExpanded && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="border-t border-border-subtle/40 px-4 py-3 bg-background/50">
                  
                  {/* Summary row */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--status-paid)/0.08)]">
                      <ArrowUpRight className="h-4 w-4 text-status-paid" />
                      <div>
                        <p className="text-[10px] text-text-muted uppercase">Entradas</p>
                        <p className="text-sm font-semibold font-mono text-status-paid tabular-nums">{fmt(inTotal)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--status-negative)/0.08)]">
                      <ArrowDownRight className="h-4 w-4 text-status-negative" />
                      <div>
                        <p className="text-[10px] text-text-muted uppercase">Saídas</p>
                        <p className="text-sm font-semibold font-mono text-status-negative tabular-nums">{fmt(outTotal)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-1.5 text-xs">
                    {details.inTotal > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-text-muted">Rendimentos ({details.incomeItems.length})</span>
                        <span className="font-mono text-status-paid tabular-nums">+{fmt(details.inTotal)}</span>
                      </div>
                    )}
                    {details.fixedTotal > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-text-muted">Despesas fixas ({details.fixedItems.length})</span>
                        <span className="font-mono text-status-negative tabular-nums">-{fmt(details.fixedTotal)}</span>
                      </div>
                    )}
                    {details.varTotal > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-text-muted">Despesas variáveis ({details.varItems.length})</span>
                        <span className="font-mono text-status-negative tabular-nums">-{fmt(details.varTotal)}</span>
                      </div>
                    )}
                    {details.invTotal > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-text-muted">Investimentos ({details.invItems.length})</span>
                        <span className="font-mono text-status-negative tabular-nums">-{fmt(details.invTotal)}</span>
                      </div>
                    )}
                    {details.transfersIn > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <div className="flex items-center gap-1 text-text-muted">
                          <ArrowRightLeft className="h-3 w-3" />
                          <span>Transferências recebidas ({details.transfersInItems.length})</span>
                        </div>
                        <span className="font-mono text-status-paid tabular-nums">+{fmt(details.transfersIn)}</span>
                      </div>
                    )}
                    {details.transfersOut > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <div className="flex items-center gap-1 text-text-muted">
                          <ArrowRightLeft className="h-3 w-3" />
                          <span>Transferências enviadas ({details.transfersOutItems.length})</span>
                        </div>
                        <span className="font-mono text-status-negative tabular-nums">-{fmt(details.transfersOut)}</span>
                      </div>
                    )}
                    {inTotal === 0 && outTotal === 0 && (
                      <p className="text-text-muted text-center py-2">Nenhuma movimentação registada.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
        {accounts.length === 0 && (
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-8 text-center">
            <Wallet className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">Nenhuma conta adicionada. Clique em "Adicionar Conta" para começar.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};