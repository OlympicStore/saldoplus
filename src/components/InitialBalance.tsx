import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Wallet, Banknote, PiggyBank, Building2 } from "lucide-react";
import type { Account } from "@/types/account";
import type { Income } from "@/types/income";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Investment } from "@/types/investment";

interface InitialBalanceProps {
  accounts: Account[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  investments: Investment[];
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
  accounts, incomes, fixedExpenses, variableExpenses, investments,
  onAdd, onUpdate, onDelete,
}: InitialBalanceProps) => {
  const [showForm, setShowForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", balance: "", type: "corrente" as Account["type"] });

  // Calculate current balance per account
  const getAccountMovements = (accountName: string) => {
    const inTotal = incomes
      .filter(i => i.account === accountName)
      .reduce((s, i) => s + i.value, 0);

    const fixedTotal = fixedExpenses
      .filter(e => e.account === accountName)
      .reduce((s, e) => {
        return s + Object.values(e.monthlyValues).reduce((a, v) => a + (v || 0), 0);
      }, 0);

    const varTotal = variableExpenses
      .filter(e => e.account === accountName)
      .reduce((s, e) => s + e.value, 0);

    const invTotal = investments
      .filter(i => i.account === accountName)
      .reduce((s, i) => s + i.value, 0);

    return { inTotal, outTotal: fixedTotal + varTotal + invTotal };
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
          <h2 className="text-lg font-semibold text-foreground">Configuração de Saldo Inicial</h2>
          <p className="text-sm text-text-muted mt-0.5">Insira o saldo atual de todas as suas contas para começar com valores corretos.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Adicionar Conta</span>
        </button>
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
          const { inTotal, outTotal } = getAccountMovements(account.name);
          const currentBalance = account.balance + inTotal - outTotal;
          const diff = currentBalance - account.balance;

          return (
            <div key={account.id} className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
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
                  <select value={account.type} onChange={(e) => onUpdate(account.id, { type: e.target.value as Account["type"] })}
                    className="text-xs text-text-muted bg-transparent border-none focus:outline-none p-0 mt-0.5">
                    <option value="corrente">Conta Corrente</option>
                    <option value="conjunta">Conta Conjunta</option>
                    <option value="poupanca">Conta Poupança</option>
                    <option value="dinheiro">Dinheiro Físico</option>
                  </select>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Inicial</p>
                      <input
                        type="text"
                        value={account.balance.toFixed(2).replace(".", ",")}
                        onChange={(e) => {
                          const num = parseFloat(e.target.value.replace(",", "."));
                          if (!isNaN(num)) onUpdate(account.id, { balance: num });
                        }}
                        className="w-24 text-sm font-mono text-right bg-background border border-border-subtle rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                      />
                    </div>
                    <button onClick={() => onDelete(account.id)} className="text-text-muted hover:text-status-negative transition-colors p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Atual</p>
                    <p className={`text-sm font-mono font-semibold tabular-nums ${currentBalance >= 0 ? "text-foreground" : "text-status-negative"}`}>
                      {fmt(currentBalance)}
                    </p>
                    {diff !== 0 && (
                      <p className={`text-[10px] font-mono tabular-nums ${diff > 0 ? "text-status-positive" : "text-status-negative"}`}>
                        {diff > 0 ? "+" : ""}{fmt(diff)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
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

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 text-center">
          <span className="label-caps text-text-muted">Saldo Inicial Total</span>
          <p className={`text-2xl font-bold font-mono tabular-nums tracking-tight mt-1 ${totalInitial >= 0 ? "text-foreground" : "text-status-negative"}`}>
            {fmt(totalInitial)}
          </p>
          <p className="text-xs text-text-muted mt-1">Soma dos saldos iniciais</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center">
          <span className="label-caps text-primary">Saldo Atual Total</span>
          <p className={`text-2xl font-bold font-mono tabular-nums tracking-tight mt-1 ${totalCurrent >= 0 ? "text-foreground" : "text-status-negative"}`}>
            {fmt(totalCurrent)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Atualizado com base nas entradas e despesas registadas
          </p>
        </div>
      </div>
    </motion.div>
  );
};
