import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FixedExpense, VariableExpense, MonthlyBillRecord, BillStatus } from "@/types/expense";
import type { FinancialGoal } from "@/types/goal";
import type { Income, SalaryConfig } from "@/types/income";
import { defaultGoals } from "@/components/FinancialGoals";

const debounce = (fn: (...args: any[]) => void, ms: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: any[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
};

export function usePersistedData() {
  const { user } = useAuth();
  const userId = user?.id;

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<SalaryConfig[]>([]);
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
  const [billRecords, setBillRecords] = useState<MonthlyBillRecord[]>([]);
  const [people, setPeople] = useState<string[]>(["João", "Maria"]);
  const [variableCategories, setVariableCategories] = useState<string[]>(["Supermercado"]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Load all data on mount
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [fe, ve, inc, sc, fg, br, us] = await Promise.all([
        supabase.from("fixed_expenses").select("*").eq("user_id", userId),
        supabase.from("variable_expenses").select("*").eq("user_id", userId),
        supabase.from("incomes").select("*").eq("user_id", userId),
        supabase.from("salary_configs").select("*").eq("user_id", userId),
        supabase.from("financial_goals").select("*").eq("user_id", userId),
        supabase.from("bill_records").select("*").eq("user_id", userId),
        supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
      ]);

      if (fe.data?.length) {
        setFixedExpenses(fe.data.map((r: any) => ({
          id: r.id, item: r.item, dueDay: r.due_day,
          monthlyValues: r.monthly_values || {},
          monthlyResponsible: r.monthly_responsible || {},
          monthlyPaid: r.monthly_paid || {},
        })));
      }

      if (ve.data?.length) {
        setVariableExpenses(ve.data.map((r: any) => ({
          id: r.id, date: r.date, description: r.description,
          category: r.category, value: Number(r.value), responsible: r.responsible,
        })));
      }

      if (inc.data?.length) {
        setIncomes(inc.data.map((r: any) => ({
          id: r.id, date: r.date, description: r.description,
          value: Number(r.value), person: r.person, type: r.type as "salary" | "other",
        })));
      }

      if (sc.data?.length) {
        setSalaryConfigs(sc.data.map((r: any) => ({
          person: r.person, monthlyValues: r.monthly_values || {}, active: r.active,
        })));
      }

      if (fg.data?.length) {
        setFinancialGoals(fg.data.map((r: any) => ({
          id: r.id, name: r.name, term: r.term as any,
          totalValue: Number(r.total_value), deadlineMonths: r.deadline_months,
          currentValue: Number(r.current_value), monthlySavings: Number(r.monthly_savings),
          account: r.account as any,
        })));
      } else {
        setFinancialGoals(defaultGoals);
      }

      if (br.data?.length) {
        setBillRecords(br.data.map((r: any) => ({
          bill: r.bill, month: r.month, status: r.status as BillStatus,
        })));
      }

      if (us.data) {
        setPeople(us.data.people || ["João", "Maria"]);
        setVariableCategories(us.data.variable_categories || ["Supermercado"]);
        setCurrentBalance(Number(us.data.current_balance) || 0);
      }

      setLoaded(true);
    };
    load();
  }, [userId]);

  // --- Sync helpers ---
  const syncFixedExpense = useCallback(async (expense: FixedExpense) => {
    if (!userId) return;
    await supabase.from("fixed_expenses").upsert({
      id: expense.id, user_id: userId, item: expense.item, due_day: expense.dueDay,
      monthly_values: expense.monthlyValues, monthly_responsible: expense.monthlyResponsible,
      monthly_paid: expense.monthlyPaid,
    }, { onConflict: "id" });
  }, [userId]);

  const syncVariableExpense = useCallback(async (expense: VariableExpense) => {
    if (!userId) return;
    await supabase.from("variable_expenses").upsert({
      id: expense.id, user_id: userId, date: expense.date,
      description: expense.description, category: expense.category,
      value: expense.value, responsible: expense.responsible,
    }, { onConflict: "id" });
  }, [userId]);

  const syncIncome = useCallback(async (income: Income) => {
    if (!userId) return;
    await supabase.from("incomes").upsert({
      id: income.id, user_id: userId, date: income.date,
      description: income.description, value: income.value,
      person: income.person, type: income.type,
    }, { onConflict: "id" });
  }, [userId]);

  const syncSalaryConfig = useCallback(async (config: SalaryConfig) => {
    if (!userId) return;
    await supabase.from("salary_configs").upsert({
      user_id: userId, person: config.person,
      monthly_values: config.monthlyValues, active: config.active,
    }, { onConflict: "user_id,person" });
  }, [userId]);

  const syncGoal = useCallback(async (goal: FinancialGoal) => {
    if (!userId) return;
    await supabase.from("financial_goals").upsert({
      id: goal.id, user_id: userId, name: goal.name, term: goal.term,
      total_value: goal.totalValue, deadline_months: goal.deadlineMonths,
      current_value: goal.currentValue, monthly_savings: goal.monthlySavings,
      account: goal.account,
    }, { onConflict: "id" });
  }, [userId]);

  const syncBillRecord = useCallback(async (bill: string, month: number, status: BillStatus) => {
    if (!userId) return;
    await supabase.from("bill_records").upsert({
      user_id: userId, bill, month, status,
    }, { onConflict: "user_id,bill,month" });
  }, [userId]);

  const debouncedSyncSettings = useRef(
    debounce(async (uid: string, p: string[], cats: string[], bal: number) => {
      await supabase.from("user_settings").upsert({
        user_id: uid, people: p, variable_categories: cats, current_balance: bal,
      }, { onConflict: "user_id" });
    }, 500)
  ).current;

  const syncSettings = useCallback((p: string[], cats: string[], bal: number) => {
    if (!userId) return;
    debouncedSyncSettings(userId, p, cats, bal);
  }, [userId, debouncedSyncSettings]);

  // --- Handlers that update state + sync ---
  const addFixed = useCallback((expense: FixedExpense) => {
    setFixedExpenses(prev => [...prev, expense]);
    syncFixedExpense(expense);
  }, [syncFixedExpense]);

  const deleteFixed = useCallback(async (id: string) => {
    setFixedExpenses(prev => prev.filter(e => e.id !== id));
    if (userId) await supabase.from("fixed_expenses").delete().eq("id", id);
  }, [userId]);

  const updateFixed = useCallback((id: string, updates: Partial<FixedExpense>) => {
    setFixedExpenses(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      const exp = updated.find(e => e.id === id);
      if (exp) syncFixedExpense(exp);
      return updated;
    });
  }, [syncFixedExpense]);

  const updateFixedMonthly = useCallback((id: string, month: number, field: "value" | "responsible" | "paid", val: number | string | null | boolean) => {
    setFixedExpenses(prev => {
      const updated = prev.map(e => {
        if (e.id !== id) return e;
        if (field === "value") return { ...e, monthlyValues: { ...e.monthlyValues, [month]: val as number } };
        if (field === "responsible") return { ...e, monthlyResponsible: { ...e.monthlyResponsible, [month]: val as string | null } };
        return { ...e, monthlyPaid: { ...e.monthlyPaid, [month]: val as boolean } };
      });
      const exp = updated.find(e => e.id === id);
      if (exp) syncFixedExpense(exp);
      return updated;
    });
  }, [syncFixedExpense]);

  const addVariable = useCallback((expense: Omit<VariableExpense, "id">) => {
    const full = { ...expense, id: crypto.randomUUID() } as VariableExpense;
    setVariableExpenses(prev => [full, ...prev]);
    syncVariableExpense(full);
  }, [syncVariableExpense]);

  const updateVariable = useCallback((id: string, updates: Partial<VariableExpense>) => {
    setVariableExpenses(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      const exp = updated.find(e => e.id === id);
      if (exp) syncVariableExpense(exp);
      return updated;
    });
  }, [syncVariableExpense]);

  const deleteVariable = useCallback(async (id: string) => {
    setVariableExpenses(prev => prev.filter(e => e.id !== id));
    if (userId) await supabase.from("variable_expenses").delete().eq("id", id);
  }, [userId]);

  const addIncome = useCallback((income: Omit<Income, "id">) => {
    const full = { ...income, id: crypto.randomUUID() } as Income;
    setIncomes(prev => [full, ...prev]);
    syncIncome(full);
  }, [syncIncome]);

  const updateIncome = useCallback((id: string, updates: Partial<Income>) => {
    setIncomes(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, ...updates } : i);
      const inc = updated.find(i => i.id === id);
      if (inc) syncIncome(inc);
      return updated;
    });
  }, [syncIncome]);

  const deleteIncome = useCallback(async (id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
    if (userId) await supabase.from("incomes").delete().eq("id", id);
  }, [userId]);

  const updateSalary = useCallback((person: string, updates: Partial<SalaryConfig>) => {
    setSalaryConfigs(prev => {
      const existing = prev.find(s => s.person === person);
      let updated: SalaryConfig[];
      if (existing) {
        updated = prev.map(s => s.person === person ? { ...s, ...updates } : s);
      } else {
        updated = [...prev, { person, monthlyValues: {}, active: true, ...updates }];
      }
      const config = updated.find(s => s.person === person);
      if (config) syncSalaryConfig(config);
      return updated;
    });
  }, [syncSalaryConfig]);

  const updateBillRecord = useCallback((bill: string, month: number, status: BillStatus) => {
    setBillRecords(prev => {
      const idx = prev.findIndex(r => r.bill === bill && r.month === month);
      if (idx >= 0) return prev.map((r, i) => i === idx ? { ...r, status } : r);
      return [...prev, { bill, month, status }];
    });
    syncBillRecord(bill, month, status);
  }, [syncBillRecord]);

  const addGoal = useCallback((goal: FinancialGoal) => {
    setFinancialGoals(prev => [...prev, goal]);
    syncGoal(goal);
  }, [syncGoal]);

  const updateGoal = useCallback((id: string, updates: Partial<FinancialGoal>) => {
    setFinancialGoals(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, ...updates } : g);
      const goal = updated.find(g => g.id === id);
      if (goal) syncGoal(goal);
      return updated;
    });
  }, [syncGoal]);

  const deleteGoal = useCallback(async (id: string) => {
    setFinancialGoals(prev => prev.filter(g => g.id !== id));
    if (userId) await supabase.from("financial_goals").delete().eq("id", id);
  }, [userId]);

  // Settings sync on change
  const updatePeople = useCallback((newPeople: string[]) => {
    setPeople(newPeople);
    setSalaryConfigs(prev => {
      const updated = [...prev];
      newPeople.forEach(p => {
        if (!updated.find(s => s.person === p)) {
          const config = { person: p, monthlyValues: {}, active: true };
          updated.push(config);
          syncSalaryConfig(config);
        }
      });
      return updated;
    });
    syncSettings(newPeople, variableCategories, currentBalance);
  }, [syncSettings, syncSalaryConfig, variableCategories, currentBalance]);

  const addCategory = useCallback((cat: string) => {
    setVariableCategories(prev => {
      const updated = [...prev, cat];
      syncSettings(people, updated, currentBalance);
      return updated;
    });
  }, [syncSettings, people, currentBalance]);

  const deleteCategory = useCallback((cat: string) => {
    setVariableCategories(prev => {
      const updated = prev.filter(c => c !== cat);
      syncSettings(people, updated, currentBalance);
      return updated;
    });
  }, [syncSettings, people, currentBalance]);

  const updateBalance = useCallback((bal: number) => {
    setCurrentBalance(bal);
    syncSettings(people, variableCategories, bal);
  }, [syncSettings, people, variableCategories]);

  return {
    loaded,
    fixedExpenses, variableExpenses, incomes, salaryConfigs,
    financialGoals, billRecords, people, variableCategories, currentBalance,
    addFixed, deleteFixed, updateFixed, updateFixedMonthly,
    addVariable, updateVariable, deleteVariable,
    addIncome, updateIncome, deleteIncome, updateSalary,
    updateBillRecord,
    addGoal, updateGoal, deleteGoal,
    updatePeople, addCategory, deleteCategory, updateBalance,
  };
}
