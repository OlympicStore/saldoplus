import { useState } from "react";
import { motion } from "framer-motion";
import { Target, PieChart, Sparkles, Heart } from "lucide-react";
import { FinancialGoals } from "./FinancialGoals";
import { CategoryBudgets } from "./CategoryBudgets";
import { FinancialScore } from "./FinancialScore";
import { CoupleMode } from "./CoupleMode";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";
import type { FinancialGoal } from "@/types/goal";

type Sub = "goals" | "budgets" | "score" | "couple";

interface Props {
  goals: FinancialGoal[];
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  incomes: Income[];
  salaryConfigs: SalaryConfig[];
  people: string[];
  selectedMonth: number;
  selectedYear: number;
  variableCategories: string[];
  onAddGoal: any; onUpdateGoal: any; onDeleteGoal: any;
  onAddCategory?: any; onDeleteCategory?: any;
  onUpdatePeople?: (people: string[]) => void;
  showBudgets: boolean;
}

const TABS: { key: Sub; label: string; icon: typeof Target }[] = [
  { key: "goals", label: "Metas", icon: Target },
  { key: "score", label: "Score", icon: Sparkles },
  { key: "budgets", label: "Orçamentos", icon: PieChart },
  { key: "couple", label: "Modo Casal", icon: Heart },
];

export function Objectives(props: Props) {
  const [sub, setSub] = useState<Sub>("goals");
  const tabs = props.showBudgets ? TABS : TABS.filter(t => t.key !== "budgets");

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">Objetivos</h2>
        <p className="text-sm text-text-muted mt-1">Metas, orçamentos e a tua saúde financeira num só painel.</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = sub === t.key;
          return (
            <button key={t.key} onClick={() => setSub(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                active
                  ? "bg-foreground text-background border-transparent shadow-sm"
                  : "bg-surface text-text-muted border-border-subtle/60 hover:bg-surface-hover hover:text-foreground"
              }`}>
              <Icon className="h-3.5 w-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {sub === "goals" && (
        <FinancialGoals goals={props.goals} onAdd={props.onAddGoal} onUpdate={props.onUpdateGoal} onDelete={props.onDeleteGoal} />
      )}
      {sub === "score" && (
        <FinancialScore
          fixedExpenses={props.fixedExpenses}
          variableExpenses={props.variableExpenses}
          incomes={props.incomes}
          salaryConfigs={props.salaryConfigs}
          financialGoals={props.goals}
          selectedMonth={props.selectedMonth}
        />
      )}
      {sub === "budgets" && props.showBudgets && (
        <CategoryBudgets
          categories={props.variableCategories}
          variableExpenses={props.variableExpenses}
          selectedMonth={props.selectedMonth}
          selectedYear={props.selectedYear}
          onAddCategory={props.onAddCategory}
          onDeleteCategory={props.onDeleteCategory}
        />
      )}
      {sub === "couple" && (
        <CoupleMode
          fixedExpenses={props.fixedExpenses}
          variableExpenses={props.variableExpenses}
          incomes={props.incomes}
          salaryConfigs={props.salaryConfigs}
          people={props.people}
          selectedMonth={props.selectedMonth}
          onUpdatePeople={props.onUpdatePeople}
        />
      )}
    </motion.div>
  );
}
