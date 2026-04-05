import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Dashboard } from "@/components/Dashboard";
import { Expenses } from "@/components/Expenses";
import { Entries } from "@/components/Entries";
import { Investments } from "@/components/Investments";
import { AnnualOverview } from "@/components/AnnualOverview";
import { FinancialGoals } from "@/components/FinancialGoals";
import { CategoryBudgets } from "@/components/CategoryBudgets";
import { InitialBalance } from "@/components/InitialBalance";
import { CategoriesManager } from "@/components/CategoriesManager";
import { SuggestionsDialog } from "@/components/SuggestionsDialog";
import { AISuggestions } from "@/components/AISuggestions";
import { SubAccountSwitcher } from "@/components/SubAccountSwitcher";
import { useSubAccount } from "@/contexts/SubAccountContext";
import AccountPanel from "@/components/AccountPanel";
import GuidedTour from "@/components/GuidedTour";

import { Settings, ChevronDown, LogOut, Shield, Tag } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistedData } from "@/hooks/usePersistedData";
import type { BillAttachment, FixedExpense } from "@/types/expense";
import { ym } from "@/lib/yearMonth";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MIN_YEAR = 2026;
const MAX_YEAR = 2028;

type Tab = "dashboard" | "balance" | "entries" | "expenses" | "investments" | "annual" | "goals" | "budgets" | "account";

const allTabs: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Home" },
  { key: "balance", label: "Saldo" },
  { key: "entries", label: "Entradas" },
  { key: "expenses", label: "Despesas" },
  { key: "investments", label: "Investimentos" },
  { key: "annual", label: "Anual" },
  { key: "goals", label: "Metas" },
  { key: "budgets", label: "Orçamentos" },
  { key: "account", label: "Conta" },
];

const planTabs: Record<string, Tab[]> = {
  essencial: ["dashboard", "balance", "entries", "expenses", "account"],
  casa: ["dashboard", "balance", "entries", "expenses", "investments", "annual", "goals", "account"],
  pro: ["dashboard", "balance", "entries", "expenses", "investments", "annual", "goals", "budgets", "account"],
};

const isTab = (value: string | null): value is Tab => allTabs.some((tab) => tab.key === value);

const Index = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const { currentSubAccountId } = useSubAccount();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const userPlan = profile?.plan || "essencial";
  const allowedTabs = planTabs[userPlan] || planTabs.essencial;
  const tabs = allTabs.filter((t) => allowedTabs.includes(t.key));
  const requestedTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<Tab>(isTab(requestedTab) ? requestedTab : "dashboard");
  const [selectedYear, setSelectedYear] = useState(Math.max(MIN_YEAR, Math.min(MAX_YEAR, now.getFullYear())));
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [showPeopleEditor, setShowPeopleEditor] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCategoriesPanel, setShowCategoriesPanel] = useState(false);
  const [editingPeople, setEditingPeople] = useState("");
  const [showTour, setShowTour] = useState(false);

  const handleShowTour = useCallback(() => setShowTour(true), []);

  useEffect(() => {
    const nextTab = isTab(requestedTab) && allowedTabs.includes(requestedTab as Tab) ? (requestedTab as Tab) : "dashboard";
    setActiveTab(nextTab);
  }, [requestedTab, userPlan]);

  const [billAttachments, setBillAttachments] = useState<BillAttachment[]>([]);
  const addAttachment = (bill: string, month: number, file: File) => {
    const fileUrl = URL.createObjectURL(file);
    setBillAttachments((prev) => {
      const filtered = prev.filter((a) => !(a.bill === bill && a.month === month));
      return [...filtered, { bill, month, fileName: file.name, fileUrl }];
    });
  };
  const removeAttachment = (bill: string, month: number) => {
    setBillAttachments((prev) => {
      const att = prev.find((a) => a.bill === bill && a.month === month);
      if (att) URL.revokeObjectURL(att.fileUrl);
      return prev.filter((a) => !(a.bill === bill && a.month === month));
    });
  };

  const data = usePersistedData(currentSubAccountId);

  // --- Year-filtered data ---
  // Fixed expenses: extract only selectedYear values from composite keys
  const yearFixedExpenses: FixedExpense[] = data.fixedExpenses.map(e => {
    const mvYear: Record<number, number> = {};
    const mrYear: Record<number, string | null> = {};
    const mpYear: Record<number, boolean> = {};
    for (let m = 0; m < 12; m++) {
      const key = ym(selectedYear, m);
      if (key in e.monthlyValues) mvYear[m] = e.monthlyValues[key] as number;
      if (key in e.monthlyResponsible) mrYear[m] = e.monthlyResponsible[key] as string | null;
      if (key in e.monthlyPaid) mpYear[m] = e.monthlyPaid[key] as boolean;
    }
    return { ...e, monthlyValues: mvYear, monthlyResponsible: mrYear, monthlyPaid: mpYear };
  });

  // Date-based data: filter by year
  const yearVariableExpenses = data.variableExpenses.filter(e => new Date(e.date).getFullYear() === selectedYear);
  const yearIncomes = data.incomes.filter(i => new Date(i.date).getFullYear() === selectedYear);
  const yearInvestments = data.investments.filter(i => new Date(i.date).getFullYear() === selectedYear);
  const yearTransfers = data.transfers.filter(t => new Date(t.date).getFullYear() === selectedYear);

  const allBillNames = data.fixedExpenses.map((e) => e.item);

  // Get display name: first + last name only
  const getDisplayName = (fullName: string | null | undefined) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const openPeopleEditor = () => {
    setEditingPeople(data.people.join(", "));
    setShowPeopleEditor(true);
  };
  const savePeople = () => {
    const newPeople = editingPeople.split(",").map((s) => s.trim()).filter(Boolean);
    if (newPeople.length > 0) {
      data.updatePeople(newPeople);
    }
    setShowPeopleEditor(false);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);

    if (tab === "dashboard") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", tab);
    }

    setSearchParams(nextParams, { replace: true });
  };

  if (!data.loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GuidedTour forceShow={showTour} onClose={() => setShowTour(false)} onNavigate={handleTabChange} />
      <header className="border-b border-border-subtle/60 bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            <span className="text-foreground">Saldo</span>
            <span className="text-primary text-2xl sm:text-3xl font-black leading-none">+</span>
          </h1>
          <div className="flex items-center gap-3">
            {profile && (
              <span className="text-xs text-text-muted hidden sm:inline">
                {getDisplayName(profile.full_name) || profile.email} · <span className="capitalize font-medium text-primary">{profile.plan}</span>
              </span>
            )}
            {userPlan === "pro" && <SubAccountSwitcher />}
            <SuggestionsDialog />
            <button onClick={() => setShowCategoriesPanel(!showCategoriesPanel)}
              className="flex items-center gap-1.5 text-text-muted hover:text-foreground transition-colors text-sm">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Categorias</span>
            </button>
            {isAdmin && (
              <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 text-text-muted hover:text-primary transition-colors text-sm">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            <button onClick={openPeopleEditor} className="flex items-center gap-1.5 text-text-muted hover:text-foreground transition-colors text-sm">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Nomes</span>
            </button>
            <button onClick={signOut} className="flex items-center gap-1.5 text-text-muted hover:text-status-negative transition-colors text-sm">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Categories panel */}
      {showCategoriesPanel && (
        <div className="border-b border-border-subtle/60 bg-surface">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <CategoriesManager
              categories={data.categories}
              onAdd={data.addCategoryItem}
              onUpdate={data.updateCategoryItem}
              onDelete={data.deleteCategoryItem}
            />
          </div>
        </div>
      )}

      <div className="border-b border-border-subtle/60 bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center">
          <div className="relative">
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors capitalize"
            >
              {MONTH_NAMES[selectedMonth]} {selectedYear}
              <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${showMonthPicker ? "rotate-180" : ""}`} />
            </button>
            {showMonthPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 w-[280px]">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {[MIN_YEAR, MIN_YEAR + 1, MAX_YEAR].map((y) => (
                      <button key={y} onClick={() => setSelectedYear(y)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedYear === y ? "bg-primary text-primary-foreground" : "text-text-muted hover:bg-surface-hover"
                        }`}>
                        {y}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTH_NAMES.map((name, i) => (
                      <button key={i}
                        onClick={() => { setSelectedMonth(i); setShowMonthPicker(false); }}
                        className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedMonth === i
                            ? "bg-primary text-primary-foreground"
                            : "text-text-secondary hover:bg-surface-hover"
                        }`}>
                        {name.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showPeopleEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowPeopleEditor(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-foreground mb-3">Editar Nomes</h3>
            <p className="text-xs text-text-muted mb-3">Separe os nomes por vírgula</p>
            <input autoFocus value={editingPeople} onChange={(e) => setEditingPeople(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && savePeople()}
              className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-1 focus:ring-primary" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowPeopleEditor(false)} className="px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover rounded-lg transition-colors">Cancelar</button>
              <button onClick={savePeople} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">Guardar</button>
            </div>
          </motion.div>
        </div>
      )}

      <nav className="border-b border-border-subtle/60 bg-surface overflow-x-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-0">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`relative px-3 sm:px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "text-foreground" : "text-text-muted hover:text-text-secondary"
              }`}>
              {tab.label}
              {activeTab === tab.key && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === "dashboard" && (
          <>
            {userPlan === "pro" && (
              <div className="mb-6 flex justify-end">
                <AISuggestions
                  fixedExpenses={data.fixedExpenses}
                  variableExpenses={data.variableExpenses}
                  incomes={data.incomes}
                  salaryConfigs={data.salaryConfigs}
                  financialGoals={data.financialGoals}
                  selectedMonth={selectedMonth}
                  currentBalance={data.currentBalance}
                />
              </div>
            )}
            <Dashboard
              fixedExpenses={data.fixedExpenses} variableExpenses={data.variableExpenses}
              incomes={data.incomes} salaryConfigs={data.salaryConfigs}
              people={data.people} selectedMonth={selectedMonth}
              currentBalance={data.currentBalance} onUpdateBalance={data.updateBalance}
              financialGoals={data.financialGoals}
              userPlan={userPlan}
              accounts={data.accounts}
            />
          </>
        )}
        {activeTab === "balance" && (
          <InitialBalance
            accounts={data.accounts}
            incomes={data.incomes}
            fixedExpenses={data.fixedExpenses}
            variableExpenses={data.variableExpenses}
            investments={data.investments}
            onAdd={data.addAccount}
            onUpdate={data.updateAccount}
            onDelete={data.deleteAccount}
          />
        )}
        {activeTab === "entries" && (
          <Entries
            incomes={data.incomes} salaryConfigs={data.salaryConfigs}
            accounts={data.accounts} transfers={data.transfers} people={data.people} selectedMonth={selectedMonth}
            onAddIncome={data.addIncome} onUpdateIncome={data.updateIncome}
            onDeleteIncome={data.deleteIncome} onUpdateSalary={data.updateSalary}
            onAddTransfer={data.addTransfer} onDeleteTransfer={data.deleteTransfer}
          />
        )}
        {activeTab === "expenses" && (
          <Expenses
            fixedExpenses={data.fixedExpenses} variableExpenses={data.variableExpenses}
            categories={data.categories} accounts={data.accounts}
            people={data.people} selectedMonth={selectedMonth}
            onAddFixed={data.addFixed} onUpdateFixed={data.updateFixed}
            onUpdateFixedMonthly={data.updateFixedMonthly} onDeleteFixed={data.deleteFixed}
            onAddVariable={data.addVariable} onUpdateVariable={data.updateVariable}
            onDeleteVariable={data.deleteVariable}
          />
        )}
        {activeTab === "investments" && (
          <Investments
            investments={data.investments} accounts={data.accounts}
            selectedMonth={selectedMonth}
            onAdd={data.addInvestment} onUpdate={data.updateInvestment}
            onDelete={data.deleteInvestment}
          />
        )}
        {activeTab === "annual" && (
          <AnnualOverview records={data.billRecords} attachments={billAttachments} billNames={allBillNames}
            onUpdate={data.updateBillRecord} onAttach={addAttachment} onRemoveAttachment={removeAttachment}
            fixedExpenses={data.fixedExpenses} variableExpenses={data.variableExpenses} goals={data.financialGoals} people={data.people}
            onAddBill={data.addFixed} onRemoveBill={data.deleteFixed} selectedMonth={selectedMonth} selectedYear={selectedYear} />
        )}
        {activeTab === "goals" && (
          <FinancialGoals goals={data.financialGoals}
            onAdd={data.addGoal}
            onUpdate={data.updateGoal}
            onDelete={data.deleteGoal} />
        )}
        {activeTab === "budgets" && (
          <CategoryBudgets
            categories={data.variableCategories}
            variableExpenses={data.variableExpenses}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}
        {activeTab === "account" && <AccountPanel onShowTour={handleShowTour} />}
      </main>
    </div>
  );
};

export default Index;
