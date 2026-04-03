import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";
import type { FinancialGoal } from "@/types/goal";

interface AISuggestionsProps {
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  incomes: Income[];
  salaryConfigs: SalaryConfig[];
  financialGoals: FinancialGoal[];
  selectedMonth: number;
  currentBalance: number;
}

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export const AISuggestions = ({
  fixedExpenses, variableExpenses, incomes, salaryConfigs,
  financialGoals, selectedMonth, currentBalance,
}: AISuggestionsProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const buildFinancialData = () => {
    const monthVars = variableExpenses.filter(e => new Date(e.date).getMonth() === selectedMonth);
    const totalFixed = fixedExpenses.reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
    const totalVariable = monthVars.reduce((s, e) => s + e.value, 0);
    const totalSalary = salaryConfigs.filter(s => s.active).reduce((s, c) => s + (c.monthlyValues[selectedMonth] ?? 0), 0);
    const monthIncomes = incomes.filter(i => new Date(i.date).getMonth() === selectedMonth);
    const totalOtherIncome = monthIncomes.filter(i => i.type === "other").reduce((s, i) => s + i.value, 0);

    // Category breakdown
    const categorySpending: Record<string, number> = {};
    monthVars.forEach(e => {
      categorySpending[e.category || "Outros"] = (categorySpending[e.category || "Outros"] || 0) + e.value;
    });

    return {
      mes: MONTH_NAMES[selectedMonth],
      saldo_atual: currentBalance,
      rendimentos: { salarios: totalSalary, outros: totalOtherIncome, total: totalSalary + totalOtherIncome },
      despesas: { fixas: totalFixed, variaveis: totalVariable, total: totalFixed + totalVariable },
      gastos_por_categoria: categorySpending,
      despesas_fixas: fixedExpenses.map(e => ({ nome: e.item, valor: e.monthlyValues[selectedMonth] ?? 0 })).filter(e => e.valor > 0),
      metas: financialGoals.map(g => ({ nome: g.name, objetivo: g.totalValue, atual: g.currentValue, prazo_meses: g.deadlineMonths })),
      balanco_mensal: (totalSalary + totalOtherIncome) - (totalFixed + totalVariable),
    };
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    setContent("");
    setError("");

    const financialData = buildFinancialData();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-suggestions`;

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ financialData }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setContent(accumulated);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setError(e.message || "Erro ao obter sugestões");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!content) fetchSuggestions();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary hover:from-primary/20 hover:to-accent/20 transition-all text-sm font-medium"
      >
        <Sparkles className="h-4 w-4" />
        Sugestões IA
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Sugestões IA</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchSuggestions}
                  disabled={loading}
                  className="p-1.5 text-text-muted hover:text-primary transition-colors disabled:opacity-50"
                  title="Atualizar sugestões"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => setOpen(false)} className="text-text-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-status-negative bg-status-negative/10 rounded-lg p-3 mb-3">
                {error}
              </div>
            )}

            {loading && !content && (
              <div className="flex items-center gap-3 py-8 justify-center">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm text-text-muted">A analisar as suas finanças...</span>
              </div>
            )}

            {content && (
              <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-text-secondary prose-strong:text-foreground prose-li:text-text-secondary">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}

            {!loading && !content && !error && (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">Clique em atualizar para obter sugestões personalizadas</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
};
