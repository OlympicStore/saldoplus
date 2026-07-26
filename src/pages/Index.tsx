import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Dashboard } from "@/components/Dashboard";
import { Investments } from "@/components/Investments";
import { CentralContas } from "@/components/CentralContas";
import { CategoryBudgets } from "@/components/CategoryBudgets";
import { InitialBalance } from "@/components/InitialBalance";
import { CategoriesManager } from "@/components/CategoriesManager";
import { AISuggestions } from "@/components/AISuggestions";
import { useSubAccount } from "@/contexts/SubAccountContext";
import AccountPanel from "@/components/AccountPanel";
import GuidedTour from "@/components/GuidedTour";
import MinhaCasa from "@/components/MinhaCasa";
import ExpirationBanner from "@/components/ExpirationBanner";
import TrialBanner from "@/components/TrialBanner";
import PartnerOnboarding from "@/components/PartnerOnboarding";
import { AIAssistant } from "@/components/AIAssistant";
import BottomNav from "@/components/BottomNav";
import { Movements } from "@/components/Movements";
import { Objectives } from "@/components/Objectives";
import AppHeader from "@/components/AppHeader";
import AppSideMenu from "@/components/AppSideMenu";
import { X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistedData } from "@/hooks/usePersistedData";
import PullToRefresh from "@/components/PullToRefresh";
import type { FixedExpense } from "@/types/expense";
import { ym } from "@/lib/yearMonth";
import { isDateInYear } from "@/lib/dateOnly";

const MIN_YEAR = 2026;
const MAX_YEAR = 2028;

type Tab =
  | "dashboard"
  | "assistente"
  | "movements"
  | "goals"
  | "balance"
  | "annual"
  | "budgets"
  | "minha_casa"
  | "account";

const ALL_TAB_KEYS: Tab[] = ["dashboard","assistente","movements","goals","balance","annual","budgets","minha_casa","account"];

const planTabs: Record<string, Tab[]> = {
  essencial: ["dashboard", "movements", "balance", "account"],
  casa: ["dashboard", "assistente", "movements", "goals", "balance", "annual", "account"],
  pro: ["dashboard", "assistente", "movements", "goals", "balance", "annual", "budgets", "account"],
  imobiliaria: ["dashboard", "assistente", "movements", "goals", "balance", "annual", "budgets", "minha_casa", "account"],
};

const isTab = (value: string | null): value is Tab => !!value && (ALL_TAB_KEYS as string[]).includes(value);


const Index = () => {
  const { profile, isAdmin, partnerBranding, signOut } = useAuth();
  const { currentSubAccountId } = useSubAccount();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const userPlan = profile?.plan || "essencial";
  // Admins têm acesso completo a todas as tabs, independentemente do plano
  const allowedTabs: Tab[] = isAdmin ? ALL_TAB_KEYS : (planTabs[userPlan] || planTabs.essencial);
  const requestedTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<Tab>(isTab(requestedTab) ? requestedTab : "dashboard");
  const [selectedYear, setSelectedYear] = useState(Math.max(MIN_YEAR, Math.min(MAX_YEAR, now.getFullYear())));
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [showPeopleEditor, setShowPeopleEditor] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCategoriesPanel, setShowCategoriesPanel] = useState(false);
  const [editingPeople, setEditingPeople] = useState("");
  const [showTour, setShowTour] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleShowTour = useCallback(() => setShowTour(true), []);

  // Apply partner branding (override primary color)
  useEffect(() => {
    if (partnerBranding?.brand_color) {
      const hex = partnerBranding.brand_color;
      // Convert hex to HSL for CSS variable
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let h = 0, s = 0;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
      }
      const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      document.documentElement.style.setProperty("--primary", hsl);
      return () => {
        document.documentElement.style.removeProperty("--primary");
      };
    }
  }, [partnerBranding]);

  useEffect(() => {
    const nextTab = isTab(requestedTab) && allowedTabs.includes(requestedTab as Tab) ? (requestedTab as Tab) : "dashboard";
    setActiveTab(nextTab);
  }, [requestedTab, userPlan]);

  // Attachments now persist via Supabase Storage + bill_attachments table (see usePersistedData).

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
  const yearVariableExpenses = data.variableExpenses.filter(e => isDateInYear(e.date, selectedYear));
  const yearIncomes = data.incomes.filter(i => isDateInYear(i.date, selectedYear));
  const yearInvestments = data.investments.filter(i => isDateInYear(i.date, selectedYear));
  const yearTransfers = data.transfers.filter(t => isDateInYear(t.date, selectedYear));

  const yearSalaryConfigs = data.salaryConfigs.map(config => {
    const monthlyValues: Record<number, number> = {};
    for (let m = 0; m < 12; m++) {
      const compositeValue = config.monthlyValues[ym(selectedYear, m)];
      const legacyValue = selectedYear === 2026 ? config.monthlyValues[m] : undefined;
      if (compositeValue !== undefined) monthlyValues[m] = compositeValue;
      else if (legacyValue !== undefined) monthlyValues[m] = legacyValue;
    }
    return { ...config, monthlyValues };
  });

  const homeAccounts = selectedYear === 2026 ? data.accounts : [];
  const homeBalance = selectedYear === 2026 ? data.currentBalance : 0;
  const homeGoals = selectedYear === 2026 ? data.financialGoals : [];

  const allBillNames = data.fixedExpenses.map((e) => e.item);

  // Year-aware wrappers for fixed expense monthly operations
  const yearUpdateFixedMonthly = useCallback((id: string, month: number, field: "value" | "responsible" | "paid", val: number | string | null | boolean) => {
    data.updateFixedMonthly(id, ym(selectedYear, month), field, val);
  }, [data.updateFixedMonthly, selectedYear]);

  const yearAddFixed = useCallback((expense: FixedExpense) => {
    // Convert 0-11 keys to composite keys for the selected year
    const convert = (obj: Record<number, any>) => {
      const result: Record<number, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        const num = Number(k);
        result[num >= 0 && num <= 11 ? ym(selectedYear, num) : num] = v;
      }
      return result;
    };
    data.addFixed({
      ...expense,
      monthlyValues: convert(expense.monthlyValues),
      monthlyResponsible: convert(expense.monthlyResponsible),
      monthlyPaid: convert(expense.monthlyPaid),
    });
  }, [data.addFixed, selectedYear]);

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
    <>
    <PullToRefresh onRefresh={async () => { await data.reload(); window.location.reload(); }}>
    <div className="min-h-screen bg-background">
      <PartnerOnboarding />
      <GuidedTour forceShow={showTour} onClose={() => setShowTour(false)} onNavigate={handleTabChange as any} plan={userPlan} />
      <ExpirationBanner />
      <TrialBanner />
      <AppHeader
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        years={[MIN_YEAR, MIN_YEAR + 1, MAX_YEAR]}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        onOpenMenu={() => setMobileMenuOpen(true)}
        onOpenProfile={() => handleTabChange("account")}
        onGoHome={() => handleTabChange("dashboard")}
      />

      <AppSideMenu
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        activeTab={activeTab}
        allowedTabs={allowedTabs as string[]}
        onNavigate={(t) => handleTabChange(t as Tab)}
        onOpenCategories={() => setShowCategoriesPanel(true)}
        onOpenPeopleEditor={openPeopleEditor}
        onOpenCoupleMode={() => handleTabChange("goals")}
      />

      {/* Categories panel */}
      {showCategoriesPanel && (
        <div className="border-b border-border-subtle/60 bg-surface">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Categorias</h3>
              <button onClick={() => setShowCategoriesPanel(false)}
                className="h-8 w-8 rounded-full bg-background border border-border-subtle text-text-muted hover:bg-surface-hover flex items-center justify-center transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <CategoriesManager
              categories={data.categories}
              onAdd={data.addCategoryItem}
              onUpdate={data.updateCategoryItem}
              onDelete={data.deleteCategoryItem}
            />
          </div>
        </div>
      )}

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



      <main className={activeTab === "assistente" ? "max-w-6xl mx-auto px-2 sm:px-6 py-4 sm:py-6" : "max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8"}>
        {activeTab === "assistente" && <AIAssistant />}
        {activeTab === "dashboard" && (
          <>
            {(userPlan === "pro" || userPlan === "imobiliaria" || isAdmin) && (
              <div className="mb-6 flex justify-end">
                <AISuggestions
                  fixedExpenses={yearFixedExpenses}
                  variableExpenses={yearVariableExpenses}
                  incomes={yearIncomes}
                  salaryConfigs={yearSalaryConfigs}
                  financialGoals={homeGoals}
                  selectedMonth={selectedMonth}
                  currentBalance={homeBalance}
                />
              </div>
            )}
            <Dashboard
              fixedExpenses={yearFixedExpenses} variableExpenses={yearVariableExpenses}
              incomes={yearIncomes} salaryConfigs={yearSalaryConfigs}
              people={data.people} selectedMonth={selectedMonth}
              financialGoals={homeGoals}
              userPlan={userPlan}
              accounts={homeAccounts}
              onUpdatePeople={data.updatePeople}
            />
          </>
        )}
        {activeTab === "balance" && (
          <InitialBalance
            accounts={data.accounts}
            incomes={yearIncomes}
            fixedExpenses={yearFixedExpenses}
            variableExpenses={yearVariableExpenses}
            investments={yearInvestments}
            transfers={yearTransfers}
            onAdd={data.addAccount}
            onUpdate={data.updateAccount}
            onDelete={data.deleteAccount}
          />
        )}
        {activeTab === "movements" && (
          <Movements
            fixedExpenses={yearFixedExpenses}
            variableExpenses={yearVariableExpenses}
            incomes={yearIncomes}
            salaryConfigs={yearSalaryConfigs}
            investments={yearInvestments}
            transfers={yearTransfers}
            accounts={data.accounts}
            categories={data.categories}
            variableCategories={data.variableCategories}
            people={data.people}
            selectedMonth={selectedMonth}
            onOpenAI={() => setActiveTab("assistente")}
            onAddIncome={data.addIncome} onUpdateIncome={data.updateIncome}
            onDeleteIncome={data.deleteIncome} onUpdateSalary={data.updateSalary}
            onAddTransfer={data.addTransfer} onDeleteTransfer={data.deleteTransfer}
            onAddFixed={yearAddFixed} onUpdateFixed={data.updateFixed}
            onUpdateFixedMonthly={yearUpdateFixedMonthly} onDeleteFixed={data.deleteFixed}
            onAddVariable={data.addVariable} onUpdateVariable={data.updateVariable}
            onDeleteVariable={data.deleteVariable}
            onAddCategoryItem={data.addCategoryItem}
            onAddInvestment={data.addInvestment}
            onUpdateInvestment={data.updateInvestment}
            onDeleteInvestment={data.deleteInvestment}
          />
        )}
        {activeTab === "annual" && (
          <CentralContas
            fixedExpenses={yearFixedExpenses}
            billNames={allBillNames}
            records={data.billRecords}
            attachments={data.billAttachments}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onUpdate={data.updateBillRecord}
            onAttach={data.addBillAttachment}
            onRemoveAttachment={data.removeBillAttachment}
            onAddBill={yearAddFixed}
            onRemoveBill={data.deleteFixed}
            onUpdateFixed={data.updateFixed}
            onUpdateFixedMonthly={data.updateFixedMonthly}
          />
        )}
        {activeTab === "goals" && (
          <Objectives
            goals={data.financialGoals}
            fixedExpenses={yearFixedExpenses}
            variableExpenses={yearVariableExpenses}
            incomes={yearIncomes}
            salaryConfigs={yearSalaryConfigs}
            people={data.people}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            variableCategories={data.variableCategories}
            onAddGoal={data.addGoal}
            onUpdateGoal={data.updateGoal}
            onDeleteGoal={data.deleteGoal}
            onAddCategory={data.addCategory}
            onDeleteCategory={data.deleteCategory}
            onUpdatePeople={data.updatePeople}
            showBudgets={allowedTabs.includes("budgets")}
          />
        )}

        {activeTab === "budgets" && (
          <CategoryBudgets
            categories={data.variableCategories}
            variableExpenses={yearVariableExpenses}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onAddCategory={data.addCategory}
            onDeleteCategory={data.deleteCategory}
          />
        )}
        {activeTab === "minha_casa" && <MinhaCasa onSave={data.refetchFixedExpenses} />}
        {activeTab === "account" && <AccountPanel onShowTour={handleShowTour} />}
      </main>
    </div>
    </PullToRefresh>
    <BottomNav
      activeTab={activeTab}
      allowedTabs={allowedTabs as string[]}
      onNavigate={(t) => handleTabChange(t as Tab)}
      onOpenMore={() => setMobileMenuOpen(true)}
    />
    </>
  );
};

export default Index;
