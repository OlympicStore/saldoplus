import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FixedExpense, VariableExpense, MonthlyBillRecord, BillStatus } from "@/types/expense";
import type { FinancialGoal } from "@/types/goal";
import type { Income, SalaryConfig } from "@/types/income";
import type { Account } from "@/types/account";
import type { Investment } from "@/types/investment";
import type { Transfer } from "@/types/transfer";
import type { Category } from "@/types/category";
import { defaultGoals } from "@/components/FinancialGoals";

const debounce = (fn: (...args: any[]) => void, ms: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: any[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
};

export function usePersistedData(subAccountId?: string | null) {
  const { user } = useAuth();
  const userId = user?.id;

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<SalaryConfig[]>([]);
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
  const [billRecords, setBillRecords] = useState<MonthlyBillRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [people, setPeople] = useState<string[]>(["João", "Maria"]);
  const [variableCategories, setVariableCategories] = useState<string[]>(["Supermercado"]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Helper to add sub_account_id filter to queries
  const withSub = (query: any) => {
    if (subAccountId) return query.eq("sub_account_id", subAccountId);
    return query.is("sub_account_id", null);
  };

  // Helper to add sub_account_id to insert payloads
  const subField = subAccountId ? { sub_account_id: subAccountId } : {};

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [fe, ve, inc, sc, fg, br, us, ac, inv, cat, tr] = await Promise.all([
        withSub(supabase.from("fixed_expenses").select("*").eq("user_id", userId)),
        withSub(supabase.from("variable_expenses").select("*").eq("user_id", userId)),
        withSub(supabase.from("incomes").select("*").eq("user_id", userId)),
        withSub(supabase.from("salary_configs").select("*").eq("user_id", userId)),
        withSub(supabase.from("financial_goals").select("*").eq("user_id", userId)),
        withSub(supabase.from("bill_records").select("*").eq("user_id", userId)),
        withSub(supabase.from("user_settings").select("*").eq("user_id", userId)).maybeSingle(),
        withSub(supabase.from("accounts").select("*").eq("user_id", userId)).order("sort_order"),
        withSub(supabase.from("investments").select("*").eq("user_id", userId)),
        withSub(supabase.from("categories").select("*").eq("user_id", userId)),
        withSub(supabase.from("transfers").select("*").eq("user_id", userId)),
      ]);

      if (fe.data?.length) {
        setFixedExpenses(fe.data.map((r: any) => ({
          id: r.id, item: r.item, dueDay: r.due_day, account: r.account || "",
          monthlyValues: r.monthly_values || {},
          monthlyResponsible: r.monthly_responsible || {},
          monthlyPaid: r.monthly_paid || {},
        })));
      }

      if (ve.data?.length) {
        setVariableExpenses(ve.data.map((r: any) => ({
          id: r.id, date: r.date, description: r.description,
          category: r.category, value: Number(r.value), responsible: r.responsible,
          account: r.account || "", recurring: r.recurring ?? false,
        })));
      }

      if (inc.data?.length) {
        setIncomes(inc.data.map((r: any) => ({
          id: r.id, date: r.date, description: r.description,
          value: Number(r.value), person: r.person, type: r.type as "salary" | "other",
          account: r.account || "",
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
          bill: r.bill, month: r.month, year: r.year ?? 2026, status: r.status as BillStatus,
        })));
      }

      if (ac.data?.length) {
        setAccounts(ac.data.map((r: any) => ({
          id: r.id, name: r.name, balance: Number(r.balance),
          type: r.type as Account["type"], sort_order: r.sort_order,
        })));
      }

      if (inv.data?.length) {
        setInvestments(inv.data.map((r: any) => ({
          id: r.id, type: r.type as Investment["type"], account: r.account,
          value: Number(r.value), date: r.date, returns: r.returns != null ? Number(r.returns) : null,
          description: r.description,
        })));
      }

      if (tr.data?.length) {
        setTransfers(tr.data.map((r: any) => ({
          id: r.id, from_account: r.from_account, to_account: r.to_account,
          value: Number(r.value), date: r.date, description: r.description,
        })));
      }

      if (cat.data?.length) {
        setCategories(cat.data.map((r: any) => ({
          id: r.id, name: r.name, type: r.type as Category["type"],
        })));
      } else {
        // Default categories with "Outros"
        const defaults: Omit<Category, "id">[] = [
          { name: "Água", type: "fixo" },
          { name: "Gás", type: "fixo" },
          { name: "Internet", type: "fixo" },
          { name: "Supermercado", type: "variavel" },
          { name: "Outros", type: "variavel" },
        ];
        const inserted: Category[] = [];
        for (const d of defaults) {
          const { data } = await supabase.from("categories").insert({ ...subField, user_id: userId, name: d.name, type: d.type }).select().single();
          if (data) inserted.push({ id: data.id, name: data.name, type: data.type as Category["type"] });
        }
        setCategories(inserted);
      }

      if (us.data) {
        setPeople(us.data.people || ["João", "Maria"]);
        setVariableCategories(us.data.variable_categories || ["Supermercado"]);
        setCurrentBalance(Number(us.data.current_balance) || 0);
      }

      setLoaded(true);
    };
    load();
  }, [userId, subAccountId]);

  // --- Sync helpers ---
  const syncFixedExpense = useCallback(async (expense: FixedExpense) => {
    if (!userId) return;
    await supabase.from("fixed_expenses").upsert({ ...subField,
      id: expense.id, user_id: userId, item: expense.item, due_day: expense.dueDay,
      account: expense.account || "",
      monthly_values: expense.monthlyValues, monthly_responsible: expense.monthlyResponsible,
      monthly_paid: expense.monthlyPaid,
    }, { onConflict: "id" });
  }, [userId, subAccountId]);

  const syncVariableExpense = useCallback(async (expense: VariableExpense) => {
    if (!userId) return;
    await supabase.from("variable_expenses").upsert({ ...subField,
      id: expense.id, user_id: userId, date: expense.date,
      description: expense.description, category: expense.category,
      value: expense.value, responsible: expense.responsible,
      account: expense.account || "", recurring: expense.recurring ?? false,
    }, { onConflict: "id" });
  }, [userId, subAccountId]);

  const syncIncome = useCallback(async (income: Income) => {
    if (!userId) return;
    await supabase.from("incomes").upsert({ ...subField,
      id: income.id, user_id: userId, date: income.date,
      description: income.description, value: income.value,
      person: income.person, type: income.type,
      account: income.account || "",
    }, { onConflict: "id" });
  }, [userId, subAccountId]);

  const syncSalaryConfig = useCallback(async (config: SalaryConfig) => {
    if (!userId) return;
    await supabase.from("salary_configs").upsert({ ...subField,
      user_id: userId, person: config.person,
      monthly_values: config.monthlyValues, active: config.active,
    }, { onConflict: "user_id,person" });
  }, [userId, subAccountId]);

  const syncGoal = useCallback(async (goal: FinancialGoal) => {
    if (!userId) return;
    await supabase.from("financial_goals").upsert({ ...subField,
      id: goal.id, user_id: userId, name: goal.name, term: goal.term,
      total_value: goal.totalValue, deadline_months: goal.deadlineMonths,
      current_value: goal.currentValue, monthly_savings: goal.monthlySavings,
      account: goal.account,
    }, { onConflict: "id" });
  }, [userId, subAccountId]);

  const syncBillRecord = useCallback(async (bill: string, month: number, status: BillStatus) => {
    if (!userId) return;
    await supabase.from("bill_records").upsert({ ...subField,
      user_id: userId, bill, month, status,
    }, { onConflict: "user_id,bill,month" });
  }, [userId, subAccountId]);

  const syncAccount = useCallback(async (account: Account) => {
    if (!userId) return;
    await supabase.from("accounts").upsert({ ...subField,
      id: account.id, user_id: userId, name: account.name,
      balance: account.balance, type: account.type, sort_order: account.sort_order,
    }, { onConflict: "id" });
  }, [userId, subAccountId]);

  const syncInvestment = useCallback(async (investment: Investment) => {
    if (!userId) return;
    await supabase.from("investments").upsert({ ...subField,
      id: investment.id, user_id: userId, type: investment.type,
      account: investment.account, value: investment.value,
      date: investment.date, returns: investment.returns,
      description: investment.description,
    }, { onConflict: "id" });
  }, [userId, subAccountId]);

  const syncTransfer = useCallback(async (transfer: Transfer) => {
    if (!userId) return;
    await supabase.from("transfers").upsert({ ...subField,
      id: transfer.id, user_id: userId, from_account: transfer.from_account,
      to_account: transfer.to_account, value: transfer.value,
      date: transfer.date, description: transfer.description,
    }, { onConflict: "id" });
  }, [userId, subAccountId]);

  const syncCategory = useCallback(async (category: Category) => {
    if (!userId) return;
    await supabase.from("categories").upsert({ ...subField,
      id: category.id, user_id: userId, name: category.name, type: category.type,
    }, { onConflict: "id" });
  }, [userId, subAccountId]);

  const debouncedSyncSettings = useRef(
    debounce(async (uid: string, p: string[], cats: string[], bal: number) => {
      await supabase.from("user_settings").upsert({ ...subField,
        user_id: uid, people: p, variable_categories: cats, current_balance: bal,
      }, { onConflict: "user_id" });
    }, 500)
  ).current;

  const syncSettings = useCallback((p: string[], cats: string[], bal: number) => {
    if (!userId) return;
    debouncedSyncSettings(userId, p, cats, bal);
  }, [userId, debouncedSyncSettings]);

  // --- Handlers ---
  const addFixed = useCallback((expense: FixedExpense) => {
    setFixedExpenses(prev => [...prev, expense]);
    syncFixedExpense(expense);
  }, [syncFixedExpense]);

  const deleteFixed = useCallback(async (id: string) => {
    setFixedExpenses(prev => prev.filter(e => e.id !== id));
    if (userId) await supabase.from("fixed_expenses").delete().eq("id", id);
  }, [userId, subAccountId]);

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
  }, [userId, subAccountId]);

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
  }, [userId, subAccountId]);

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
  }, [userId, subAccountId]);

  // Accounts
  const addAccount = useCallback((account: Omit<Account, "id">) => {
    const full = { ...account, id: crypto.randomUUID() };
    setAccounts(prev => [...prev, full]);
    syncAccount(full);
  }, [syncAccount]);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setAccounts(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      const acc = updated.find(a => a.id === id);
      if (acc) syncAccount(acc);
      return updated;
    });
  }, [syncAccount]);

  const deleteAccount = useCallback(async (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (userId) await supabase.from("accounts").delete().eq("id", id);
  }, [userId, subAccountId]);

  // Investments
  const addInvestment = useCallback((investment: Omit<Investment, "id">) => {
    const full = { ...investment, id: crypto.randomUUID() };
    setInvestments(prev => [full, ...prev]);
    syncInvestment(full);
  }, [syncInvestment]);

  const updateInvestment = useCallback((id: string, updates: Partial<Investment>) => {
    setInvestments(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, ...updates } : i);
      const inv = updated.find(i => i.id === id);
      if (inv) syncInvestment(inv);
      return updated;
    });
  }, [syncInvestment]);

  const deleteInvestment = useCallback(async (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    if (userId) await supabase.from("investments").delete().eq("id", id);
  }, [userId, subAccountId]);

  // Transfers
  const addTransfer = useCallback((transfer: Omit<Transfer, "id">) => {
    const full = { ...transfer, id: crypto.randomUUID() };
    setTransfers(prev => [full, ...prev]);
    syncTransfer(full);
  }, [syncTransfer]);

  const deleteTransfer = useCallback(async (id: string) => {
    setTransfers(prev => prev.filter(t => t.id !== id));
    if (userId) await supabase.from("transfers").delete().eq("id", id);
  }, [userId, subAccountId]);

  // Categories
  const addCategoryItem = useCallback(async (category: Omit<Category, "id">) => {
    if (!userId) return;
    const { data } = await supabase.from("categories").insert({ ...subField, user_id: userId, name: category.name, type: category.type }).select().single();
    if (data) {
      setCategories(prev => [...prev, { id: data.id, name: data.name, type: data.type as Category["type"] }]);
    }
  }, [userId, subAccountId]);

  const updateCategoryItem = useCallback(async (id: string, updates: Partial<Category>) => {
    setCategories(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      return updated;
    });
    if (userId) {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.type !== undefined) updateData.type = updates.type;
      await supabase.from("categories").update(updateData).eq("id", id);
    }
  }, [userId, subAccountId]);

  const deleteCategoryItem = useCallback(async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    if (userId) await supabase.from("categories").delete().eq("id", id);
  }, [userId, subAccountId]);

  // Settings sync
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
    accounts, investments, categories, transfers,
    addFixed, deleteFixed, updateFixed, updateFixedMonthly,
    addVariable, updateVariable, deleteVariable,
    addIncome, updateIncome, deleteIncome, updateSalary,
    updateBillRecord,
    addGoal, updateGoal, deleteGoal,
    updatePeople, addCategory, deleteCategory, updateBalance,
    addAccount, updateAccount, deleteAccount,
    addInvestment, updateInvestment, deleteInvestment,
    addCategoryItem, updateCategoryItem, deleteCategoryItem,
    addTransfer, deleteTransfer,
  };
}
