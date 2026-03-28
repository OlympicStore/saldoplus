import { motion } from "framer-motion";
import { PersonSelector } from "./PersonSelector";
import type { FixedExpense } from "@/types/expense";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface FixedExpensesProps {
  expenses: FixedExpense[];
  people: string[];
  selectedMonth: number;
  onUpdate: (id: string, updates: Partial<FixedExpense>) => void;
  onUpdateMonthly: (id: string, month: number, field: "value" | "responsible" | "paid", val: number | string | null | boolean) => void;
  onAdd: (expense: FixedExpense) => void;
  onDelete: (id: string) => void;
}

export const FixedExpenses = ({ expenses, people, selectedMonth, onUpdate, onUpdateMonthly, onAdd, onDelete }: FixedExpensesProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<"value" | "item" | null>(null);
  const [editValue, setEditValue] = useState("");

  const getValue = (e: FixedExpense) => e.monthlyValues[selectedMonth] ?? 0;
  const getResponsible = (e: FixedExpense) => e.monthlyResponsible[selectedMonth] ?? null;
  const getPaid = (e: FixedExpense) => e.monthlyPaid[selectedMonth] ?? false;

  const total = expenses.reduce((sum, e) => sum + getValue(e), 0);
  const paid = expenses.filter((e) => getPaid(e)).length;

  const startEdit = (expense: FixedExpense, field: "value" | "item") => {
    setEditingId(expense.id);
    setEditField(field);
    setEditValue(field === "value" ? getValue(expense).toFixed(2).replace(".", ",") : expense.item);
  };

  const saveEdit = (id: string) => {
    if (editField === "value") {
      const num = parseFloat(editValue.replace(",", "."));
      if (!isNaN(num)) onUpdateMonthly(id, selectedMonth, "value", num);
    } else if (editField === "item") {
      if (editValue.trim()) onUpdate(id, { item: editValue.trim() });
    }
    setEditingId(null);
    setEditField(null);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gastos Fixos</h2>
          <p className="text-sm text-text-muted mt-0.5">{paid}/{expenses.length} pagos este mês</p>
        </div>
        <div className="text-right">
          <span className="label-caps">Total Fixos</span>
          <p className="text-xl sm:text-2xl font-semibold text-foreground font-mono tabular-nums tracking-tight">
            € {total.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 mb-1">
        <span className="col-span-3 label-caps">Item</span>
        <span className="col-span-2 label-caps">Vencimento</span>
        <span className="col-span-2 label-caps text-right">Valor</span>
        <span className="col-span-3 label-caps">Responsável</span>
        <span className="col-span-2 label-caps text-right">Status</span>
      </div>

      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 divide-y divide-border-subtle/40">
        {expenses.map((expense) => (
          <div key={expense.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
            {/* Desktop */}
            <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                {editingId === expense.id && editField === "item" ? (
                  <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(expense.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(expense.id)}
                    className="w-full text-sm font-semibold bg-transparent border border-primary rounded-lg px-2 py-1 focus:outline-none" />
                ) : (
                  <button onClick={() => startEdit(expense, "item")} className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left">
                    {expense.item}
                  </button>
                )}
              </div>
              <div className="col-span-2">
                <input type="number" min={1} max={31} value={expense.dueDay}
                  onChange={(e) => onUpdate(expense.id, { dueDay: parseInt(e.target.value) || 1 })}
                  className="w-16 text-sm text-text-secondary bg-transparent border border-border-subtle rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="col-span-2 text-right">
                {editingId === expense.id && editField === "value" ? (
                  <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(expense.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(expense.id)}
                    className="w-full text-sm font-mono text-right bg-transparent border border-primary rounded-lg px-2 py-1 focus:outline-none" />
                ) : (
                  <button onClick={() => startEdit(expense, "value")} className="font-mono text-sm text-text-secondary tabular-nums hover:text-foreground transition-colors">
                    € {getValue(expense).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                  </button>
                )}
              </div>
              <div className="col-span-3">
                <PersonSelector value={getResponsible(expense)} onChange={(p) => onUpdateMonthly(expense.id, selectedMonth, "responsible", p)} people={people} />
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <button onClick={() => onUpdateMonthly(expense.id, selectedMonth, "paid", !getPaid(expense))} className="flex items-center gap-1.5 group">
                  <div className={`h-2.5 w-2.5 rounded-full transition-colors ${getPaid(expense) ? "bg-status-paid" : "bg-status-pending"}`} />
                  <span className="text-xs text-text-muted group-hover:text-foreground transition-colors">{getPaid(expense) ? "Pago" : "Pendente"}</span>
                </button>
                <button onClick={() => onDelete(expense.id)} className="text-text-muted hover:text-red-500 transition-colors p-0.5">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile */}
            <div className="sm:hidden space-y-2.5">
              <div className="flex items-center justify-between">
                {editingId === expense.id && editField === "item" ? (
                  <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(expense.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(expense.id)}
                    className="flex-1 text-sm font-semibold bg-transparent border border-primary rounded-lg px-2 py-1 focus:outline-none" />
                ) : (
                  <button onClick={() => startEdit(expense, "item")} className="text-sm font-semibold text-foreground">{expense.item}</button>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => onUpdateMonthly(expense.id, selectedMonth, "paid", !getPaid(expense))} className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${getPaid(expense) ? "bg-status-paid" : "bg-status-pending"}`} />
                    <span className="text-xs text-text-muted">{getPaid(expense) ? "Pago" : "Pendente"}</span>
                  </button>
                  <button onClick={() => onDelete(expense.id)} className="text-text-muted hover:text-red-500 transition-colors p-0.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Dia</span>
                  <input type="number" min={1} max={31} value={expense.dueDay}
                    onChange={(e) => onUpdate(expense.id, { dueDay: parseInt(e.target.value) || 1 })}
                    className="w-12 text-sm text-text-secondary bg-transparent border border-border-subtle rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                {editingId === expense.id && editField === "value" ? (
                  <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(expense.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(expense.id)}
                    className="w-28 text-sm font-mono text-right bg-transparent border border-primary rounded-lg px-2 py-1 focus:outline-none" />
                ) : (
                  <button onClick={() => startEdit(expense, "value")} className="font-mono text-sm text-text-secondary tabular-nums">
                    € {getValue(expense).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                  </button>
                )}
              </div>
              <PersonSelector value={getResponsible(expense)} onChange={(p) => onUpdateMonthly(expense.id, selectedMonth, "responsible", p)} people={people} />
            </div>
          </div>
        ))}
      </div>

      {/* Add new fixed expense */}
      <button
        onClick={() => onAdd({ id: crypto.randomUUID(), item: "Novo Gasto", dueDay: 1, monthlyValues: {}, monthlyResponsible: {}, monthlyPaid: {} })}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-text-muted hover:text-foreground border border-dashed border-border-subtle rounded-xl hover:bg-surface-hover transition-colors"
      >
        <Plus className="h-4 w-4" />
        Adicionar Gasto Fixo
      </button>
    </motion.div>
  );
};
