import { FileDown } from "lucide-react";
import type { Income } from "@/types/income";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Investment } from "@/types/investment";
import type { Account } from "@/types/account";
import type { Transfer } from "@/types/transfer";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface MonthlyReportProps {
  selectedMonth: number;
  selectedYear: number;
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  investments: Investment[];
  accounts: Account[];
  transfers: Transfer[];
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

export const MonthlyReport = ({
  selectedMonth, selectedYear, incomes, fixedExpenses, variableExpenses, investments, accounts, transfers,
}: MonthlyReportProps) => {

  const download = () => {
    const monthIncomes = incomes.filter(i => new Date(i.date).getMonth() === selectedMonth);
    const monthVariable = variableExpenses.filter(e => new Date(e.date).getMonth() === selectedMonth);
    const monthInvestments = investments.filter(i => new Date(i.date).getMonth() === selectedMonth);
    const monthTransfers = transfers.filter(t => new Date(t.date).getMonth() === selectedMonth);

    const totalIncomes = monthIncomes.reduce((s, i) => s + i.value, 0);
    const totalFixed = fixedExpenses.reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
    const totalVariable = monthVariable.reduce((s, e) => s + e.value, 0);
    const totalExpenses = totalFixed + totalVariable;
    const totalInvestments = monthInvestments.reduce((s, i) => s + i.value, 0);
    const balance = totalIncomes - totalExpenses - totalInvestments;

    let csv = `Relatório Financeiro - ${MONTH_NAMES[selectedMonth]} ${selectedYear}\n\n`;

    csv += `RESUMO\n`;
    csv += `Total Entradas;${fmt(totalIncomes)}\n`;
    csv += `Total Despesas;${fmt(totalExpenses)}\n`;
    csv += `Total Investimentos;${fmt(totalInvestments)}\n`;
    csv += `Balanço;${fmt(balance)}\n\n`;

    csv += `CONTAS\n`;
    csv += `Nome;Saldo Inicial\n`;
    accounts.forEach(a => { csv += `${a.name};${fmt(a.balance)}\n`; });
    csv += `\n`;

    csv += `ENTRADAS\n`;
    csv += `Descrição;Conta;Valor;Data\n`;
    monthIncomes.forEach(i => {
      csv += `${i.description};${i.account};${fmt(i.value)};${i.date}\n`;
    });
    csv += `\n`;

    csv += `DESPESAS FIXAS (F)\n`;
    csv += `Item;Valor;Dia Venc.;Status\n`;
    fixedExpenses.forEach(e => {
      const val = e.monthlyValues[selectedMonth] ?? 0;
      if (val > 0) csv += `${e.item};${fmt(val)};${e.dueDay};${e.monthlyPaid[selectedMonth] ? "Pago" : "Pendente"}\n`;
    });
    csv += `\n`;

    csv += `DESPESAS INEVITÁVEIS (I) + NÃO-ESSENCIAIS (N)\n`;
    csv += `Descrição;Categoria;Conta;Valor;Data\n`;
    monthVariable.forEach(e => {
      csv += `${e.description};${e.category};${e.account};${fmt(e.value)};${e.date}\n`;
    });
    csv += `\n`;

    csv += `INVESTIMENTOS\n`;
    csv += `Tipo;Descrição;Conta;Valor;Data;Rentabilidade\n`;
    monthInvestments.forEach(i => {
      csv += `${i.type};${i.description};${i.account};${fmt(i.value)};${i.date};${i.returns != null ? fmt(i.returns) : "—"}\n`;
    });
    csv += `\n`;

    csv += `TRANSFERÊNCIAS\n`;
    csv += `De;Para;Valor;Data;Descrição\n`;
    monthTransfers.forEach(t => {
      csv += `${t.from_account};${t.to_account};${fmt(t.value)};${t.date};${t.description}\n`;
    });

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${MONTH_NAMES[selectedMonth].toLowerCase()}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={download}
      className="flex items-center gap-1.5 text-text-muted hover:text-foreground transition-colors text-sm">
      <FileDown className="h-4 w-4" />
      <span className="hidden sm:inline">Relatório</span>
    </button>
  );
};
