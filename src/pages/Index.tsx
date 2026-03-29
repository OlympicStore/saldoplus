import { useState } from "react";
import { motion } from "framer-motion";
import { Dashboard } from "@/components/Dashboard";
import { FixedExpenses } from "@/components/FixedExpenses";
import { VariableExpenses } from "@/components/VariableExpenses";
import { AnnualOverview } from "@/components/AnnualOverview";
import { Income } from "@/components/Income";
import { Settings, ChevronLeft, ChevronRight, LogOut, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { FixedExpense, VariableExpense, MonthlyBillRecord, BillStatus, BillAttachment } from "@/types/expense";
import type { FinancialGoal } from "@/types/goal";
import type { Income as IncomeType, SalaryConfig } from "@/types/income";
import { FinancialGoals, defaultGoals } from "@/components/FinancialGoals";
import { useAuth } from "@/contexts/AuthContext";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const MIN_YEAR = 2026;
const MAX_YEAR = 2028;

const initialFixedExpenses: FixedExpense[] = [
  { id: "1", item: "Água", dueDay: 10, monthlyValues: {}, monthlyResponsible: {}, monthlyPaid: {} },
  { id: "2", item: "Gás/Eletricidade", dueDay: 15, monthlyValues: {}, monthlyResponsible: {}, monthlyPaid: {} },
  { id: "3", item: "Internet", dueDay: 20, monthlyValues: {}, monthlyResponsible: {}, monthlyPaid: {} },
];

const defaultPeople = ["João", "Maria"];
const defaultCategories = ["Supermercado"];

type Tab = "dashboard" | "fixed" | "variable" | "income" | "annual" | "goals";

const allTabs: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Home" },
  { key: "fixed", label: "Fixos" },
  { key: "variable", label: "Variáveis" },
  { key: "income", label: "Rendimentos" },
  { key: "annual", label: "Anual" },
  { key: "goals", label: "Metas" },
];

const planTabs: Record<string, Tab[]> = {
  essencial: ["dashboard", "fixed", "variable", "annual"],
  casa: ["dashboard", "fixed", "variable", "income", "annual", "goals"],
  pro: ["dashboard", "fixed", "variable", "income", "annual", "goals"],
};

const Index = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const userPlan = profile?.plan || "essencial";
  const allowedTabs = planTabs[userPlan] || planTabs.essencial;
  const tabs = allTabs.filter((t) => allowedTabs.includes(t.key));
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedYear, setSelectedYear] = useState(Math.max(MIN_YEAR, Math.min(MAX_YEAR, now.getFullYear())));
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(initialFixedExpenses);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [billRecords, setBillRecords] = useState<MonthlyBillRecord[]>([]);
  const [billAttachments, setBillAttachments] = useState<BillAttachment[]>([]);
  const [people, setPeople] = useState<string[]>(defaultPeople);
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>(defaultGoals);
  const [showPeopleEditor, setShowPeopleEditor] = useState(false);
  const [editingPeople, setEditingPeople] = useState("");
  const [currentBalance, setCurrentBalance] = useState(0);
  const [incomes, setIncomes] = useState<IncomeType[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<SalaryConfig[]>(
    defaultPeople.map((p) => ({ person: p, monthlyValues: {}, active: true }))
  );
  const [variableCategories, setVariableCategories] = useState<string[]>(defaultCategories);

  const allBillNames = [
    ...fixedExpenses.map((e) => e.item),
    ...variableCategories,
  ];

  // Fixed expenses handlers
  const addFixed = (expense: FixedExpense) => setFixedExpenses((prev) => [...prev, expense]);
  const deleteFixed = (id: string) => setFixedExpenses((prev) => prev.filter((e) => e.id !== id));
  const updateFixed = (id: string, updates: Partial<FixedExpense>) =>
    setFixedExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  const updateFixedMonthly = (id: string, month: number, field: "value" | "responsible" | "paid", val: number | string | null | boolean) => {
    setFixedExpenses((prev) => prev.map((e) => {
      if (e.id !== id) return e;
      if (field === "value") return { ...e, monthlyValues: { ...e.monthlyValues, [month]: val as number } };
      if (field === "responsible") return { ...e, monthlyResponsible: { ...e.monthlyResponsible, [month]: val as string | null } };
      return { ...e, monthlyPaid: { ...e.monthlyPaid, [month]: val as boolean } };
    }));
  };

  // Variable expenses handlers
  const addVariable = (expense: Omit<VariableExpense, "id">) =>
    setVariableExpenses((prev) => [{ ...expense, id: crypto.randomUUID() }, ...prev]);
  const updateVariable = (id: string, updates: Partial<VariableExpense>) =>
    setVariableExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  const deleteVariable = (id: string) => setVariableExpenses((prev) => prev.filter((e) => e.id !== id));

  // Income handlers
  const addIncome = (income: Omit<IncomeType, "id">) =>
    setIncomes((prev) => [{ ...income, id: crypto.randomUUID() }, ...prev]);
  const updateIncome = (id: string, updates: Partial<IncomeType>) =>
    setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  const deleteIncome = (id: string) => setIncomes((prev) => prev.filter((i) => i.id !== id));
  const updateSalary = (person: string, updates: Partial<SalaryConfig>) => {
    setSalaryConfigs((prev) => {
      const existing = prev.find((s) => s.person === person);
      if (existing) return prev.map((s) => (s.person === person ? { ...s, ...updates } : s));
      return [...prev, { person, monthlyValues: {}, active: true, ...updates }];
    });
  };

  // Bill records
  const updateBillRecord = (bill: string, month: number, status: BillStatus) => {
    setBillRecords((prev) => {
      const existing = prev.findIndex((r) => r.bill === bill && r.month === month);
      if (existing >= 0) return prev.map((r, i) => (i === existing ? { ...r, status } : r));
      return [...prev, { bill, month, status }];
    });
  };
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

  // Category handlers
  const addCategory = (cat: string) => setVariableCategories((prev) => [...prev, cat]);
  const deleteCategory = (cat: string) => setVariableCategories((prev) => prev.filter((c) => c !== cat));

  // People editor
  const openPeopleEditor = () => {
    setEditingPeople(people.join(", "));
    setShowPeopleEditor(true);
  };
  const savePeople = () => {
    const newPeople = editingPeople.split(",").map((s) => s.trim()).filter(Boolean);
    if (newPeople.length > 0) {
      setPeople(newPeople);
      // Ensure salary configs exist for new people
      setSalaryConfigs((prev) => {
        const updated = [...prev];
        newPeople.forEach((p) => {
          if (!updated.find((s) => s.person === p)) {
            updated.push({ person: p, monthlyValues: {}, active: true });
          }
        });
        return updated;
      });
    }
    setShowPeopleEditor(false);
  };

  const prevMonth = () => {
    if (selectedMonth === 0) {
      if (selectedYear > MIN_YEAR) {
        setSelectedMonth(11);
        setSelectedYear((y) => y - 1);
      }
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (selectedMonth === 11) {
      if (selectedYear < MAX_YEAR) {
        setSelectedMonth(0);
        setSelectedYear((y) => y + 1);
      }
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };
  const isFirstMonth = selectedYear === MIN_YEAR && selectedMonth === 0;
  const isLastMonth = selectedYear === MAX_YEAR && selectedMonth === 11;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-subtle/60 bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">Dashboard Financeiro</h1>
          <div className="flex items-center gap-3">
            {profile && (
              <span className="text-xs text-text-muted hidden sm:inline">
                {profile.full_name || profile.email} · <span className="capitalize font-medium text-primary">{profile.plan}</span>
              </span>
            )}
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

      <div className="border-b border-border-subtle/60 bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center gap-4">
          <button onClick={prevMonth} disabled={isFirstMonth} className="p-1 text-text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[160px] text-center capitalize">
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </span>
          <button onClick={nextMonth} disabled={isLastMonth} className="p-1 text-text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="h-5 w-5" />
          </button>
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
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
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
          <Dashboard
            fixedExpenses={fixedExpenses} variableExpenses={variableExpenses}
            incomes={incomes} salaryConfigs={salaryConfigs}
            people={people} selectedMonth={selectedMonth}
            currentBalance={currentBalance} onUpdateBalance={setCurrentBalance}
          />
        )}
        {activeTab === "fixed" && (
          <FixedExpenses expenses={fixedExpenses} onUpdate={updateFixed} onUpdateMonthly={updateFixedMonthly}
            onAdd={addFixed} onDelete={deleteFixed} people={people} selectedMonth={selectedMonth} />
        )}
        {activeTab === "variable" && (
          <VariableExpenses expenses={variableExpenses} onAdd={addVariable} onUpdate={updateVariable}
            onDelete={deleteVariable} people={people} selectedMonth={selectedMonth}
            categories={variableCategories} onAddCategory={addCategory} onDeleteCategory={deleteCategory} />
        )}
        {activeTab === "income" && (
          <Income incomes={incomes} salaryConfigs={salaryConfigs} people={people} selectedMonth={selectedMonth}
            onAddIncome={addIncome} onUpdateIncome={updateIncome} onDeleteIncome={deleteIncome} onUpdateSalary={updateSalary} />
        )}
        {activeTab === "annual" && (
          <AnnualOverview records={billRecords} attachments={billAttachments} billNames={allBillNames}
            onUpdate={updateBillRecord} onAttach={addAttachment} onRemoveAttachment={removeAttachment}
            fixedExpenses={fixedExpenses} variableExpenses={variableExpenses} goals={financialGoals} people={people} />
        )}
        {activeTab === "goals" && (
          <FinancialGoals goals={financialGoals}
            onAdd={(g) => setFinancialGoals((prev) => [...prev, g])}
            onUpdate={(id, u) => setFinancialGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...u } : g)))}
            onDelete={(id) => setFinancialGoals((prev) => prev.filter((g) => g.id !== id))} />
        )}
      </main>
    </div>
  );
};

export default Index;
