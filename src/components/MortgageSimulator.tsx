import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Calculator,
  TrendingDown,
  Wallet,
  AlertCircle,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  PiggyBank,
  Loader2,
  FileText,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

const fmt = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmt2 = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Simulation {
  id: string;
  name: string;
  loan_amount: number;
  annual_rate: number;
  term_years: number;
  monthly_income: number;
  extra_monthly_costs: number;
  extra_payment: number;
  notes: string | null;
  created_at: string;
}

interface AmortRow {
  month: number;
  year: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  extraPayment: number;
}

const calcPMT = (principal: number, annualRate: number, years: number) => {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

const buildSchedule = (
  principal: number,
  annualRate: number,
  years: number,
  extraPayment: number = 0
): AmortRow[] => {
  const r = annualRate / 100 / 12;
  const basePayment = calcPMT(principal, annualRate, years);
  const maxMonths = years * 12;
  const rows: AmortRow[] = [];
  let balance = principal;
  for (let m = 1; m <= maxMonths && balance > 0.01; m++) {
    const interest = balance * r;
    let principalPaid = basePayment - interest;
    let extra = extraPayment;
    if (principalPaid + extra > balance) {
      extra = Math.max(0, balance - principalPaid);
      if (principalPaid > balance) principalPaid = balance;
    }
    balance -= principalPaid + extra;
    if (balance < 0) balance = 0;
    rows.push({
      month: ((m - 1) % 12) + 1,
      year: Math.ceil(m / 12),
      payment: basePayment + extra,
      interest,
      principal: principalPaid,
      balance,
      extraPayment: extra,
    });
  }
  return rows;
};

const MortgageSimulator = () => {
  const { user } = useAuth();
  const [loanAmount, setLoanAmount] = useState(150000);
  const [annualRate, setAnnualRate] = useState(3.5);
  const [termYears, setTermYears] = useState(30);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [extraMonthlyCosts, setExtraMonthlyCosts] = useState(0);
  const [extraPayment, setExtraPayment] = useState(0);
  const [simName, setSimName] = useState("Simulação 1");
  const [savedSims, setSavedSims] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    loadSimulations();
  }, [user]);

  const loadSimulations = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("mortgage_simulations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setSavedSims(data as Simulation[]);
    setLoading(false);
  };

  // === CÁLCULOS ===
  const baseSchedule = useMemo(
    () => buildSchedule(loanAmount, annualRate, termYears, 0),
    [loanAmount, annualRate, termYears]
  );
  const extraSchedule = useMemo(
    () => buildSchedule(loanAmount, annualRate, termYears, extraPayment),
    [loanAmount, annualRate, termYears, extraPayment]
  );

  const basePayment = useMemo(() => calcPMT(loanAmount, annualRate, termYears), [loanAmount, annualRate, termYears]);
  const totalCost = baseSchedule.reduce((s, r) => s + r.payment, 0);
  const totalInterest = totalCost - loanAmount;
  const realMonthlyCost = basePayment + extraMonthlyCosts;
  const margin = monthlyIncome - realMonthlyCost;
  const effortRatio = monthlyIncome > 0 ? (basePayment / monthlyIncome) * 100 : 0;

  // Com pagamento extra
  const extraTotalCost = extraSchedule.reduce((s, r) => s + r.payment, 0);
  const extraTotalInterest = extraTotalCost - loanAmount;
  const interestSaved = totalInterest - extraTotalInterest;
  const monthsSaved = baseSchedule.length - extraSchedule.length;
  const yearsSaved = Math.floor(monthsSaved / 12);
  const remainderMonths = monthsSaved % 12;

  // Status esforço
  const effortStatus = useMemo(() => {
    if (monthlyIncome === 0)
      return { label: "—", color: "text-muted-foreground", bg: "bg-muted/30", emoji: "💡" };
    if (effortRatio < 30)
      return { label: "Saudável", color: "text-success", bg: "bg-success/10", emoji: "🟢" };
    if (effortRatio < 40)
      return { label: "Atenção", color: "text-warning", bg: "bg-warning/10", emoji: "🟡" };
    return { label: "Risco", color: "text-destructive", bg: "bg-destructive/10", emoji: "🔴" };
  }, [effortRatio, monthlyIncome]);

  // Dados do gráfico (anuais)
  const chartData = useMemo(() => {
    const yearly: Record<number, { year: number; balance: number; interest: number; principal: number }> = {};
    baseSchedule.forEach((r, idx) => {
      const yr = r.year;
      if (!yearly[yr]) yearly[yr] = { year: yr, balance: 0, interest: 0, principal: 0 };
      yearly[yr].balance = r.balance;
      yearly[yr].interest += r.interest;
      yearly[yr].principal += r.principal;
    });
    return Object.values(yearly);
  }, [baseSchedule]);

  // Tabela agrupada por ano
  const yearlyTable = useMemo(() => {
    const grouped: Record<number, AmortRow[]> = {};
    baseSchedule.forEach((r) => {
      if (!grouped[r.year]) grouped[r.year] = [];
      grouped[r.year].push(r);
    });
    return Object.entries(grouped).map(([year, rows]) => {
      const totalPayment = rows.reduce((s, r) => s + r.payment, 0);
      const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
      const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
      const endBalance = rows[rows.length - 1].balance;
      return {
        year: Number(year),
        rows,
        totalPayment,
        totalInterest,
        totalPrincipal,
        endBalance,
      };
    });
  }, [baseSchedule]);

  // Insights
  const insights = useMemo(() => {
    const items: string[] = [];
    items.push(`💸 Vai pagar **${fmt(totalInterest)}** em juros ao longo de ${termYears} anos.`);
    if (monthlyIncome > 0) {
      items.push(`📊 Este crédito consome **${effortRatio.toFixed(1)}%** do seu rendimento mensal.`);
    }
    if (extraPayment > 0 && interestSaved > 0) {
      items.push(
        `🚀 Com **+${fmt(extraPayment)}/mês**, poupa **${yearsSaved}a ${remainderMonths}m** e **${fmt(interestSaved)}** em juros.`
      );
    }
    if (margin < 0 && monthlyIncome > 0) {
      items.push(`⚠️ O custo real ultrapassa o seu rendimento em **${fmt(Math.abs(margin))}**.`);
    }
    return items;
  }, [totalInterest, termYears, monthlyIncome, effortRatio, extraPayment, interestSaved, yearsSaved, remainderMonths, margin]);

  const handleSave = async () => {
    if (!user) return;
    if (!simName.trim()) {
      toast.error("Dá um nome à simulação");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("mortgage_simulations").insert({
      user_id: user.id,
      name: simName.trim(),
      loan_amount: loanAmount,
      annual_rate: annualRate,
      term_years: termYears,
      monthly_income: monthlyIncome,
      extra_monthly_costs: extraMonthlyCosts,
      extra_payment: extraPayment,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar");
      return;
    }
    toast.success("Simulação guardada");
    loadSimulations();
  };

  const handleLoad = (s: Simulation) => {
    setSimName(s.name);
    setLoanAmount(Number(s.loan_amount));
    setAnnualRate(Number(s.annual_rate));
    setTermYears(s.term_years);
    setMonthlyIncome(Number(s.monthly_income));
    setExtraMonthlyCosts(Number(s.extra_monthly_costs));
    setExtraPayment(Number(s.extra_payment));
    toast.success(`"${s.name}" carregada`);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("mortgage_simulations").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao apagar");
      return;
    }
    toast.success("Removida");
    loadSimulations();
  };

  const exportCSV = () => {
    const header = "Mês,Ano,Prestação,Juros,Capital,Pagamento Extra,Dívida Restante\n";
    const rows = baseSchedule
      .map((r, i) => `${i + 1},${r.year},${r.payment.toFixed(2)},${r.interest.toFixed(2)},${r.principal.toFixed(2)},${r.extraPayment.toFixed(2)},${r.balance.toFixed(2)}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${simName || "simulacao"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-border-subtle/60 bg-gradient-to-br from-primary/5 to-primary/0 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Simulador de Crédito Habitação</h2>
            <p className="text-sm text-muted-foreground">Veja o custo real do seu crédito e simule pagamentos extra</p>
          </div>
        </div>
      </div>

      {/* INPUTS */}
      <div className="rounded-xl border border-border-subtle/60 bg-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome da simulação</label>
            <input
              type="text"
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              maxLength={100}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Valor do empréstimo (€)</label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Taxa de juro anual (%)</label>
            <input
              type="number"
              step="0.01"
              value={annualRate}
              onChange={(e) => setAnnualRate(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Prazo (anos)</label>
            <input
              type="number"
              value={termYears}
              onChange={(e) => setTermYears(Math.max(1, Math.min(50, Number(e.target.value))))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Rendimento mensal (€) <span className="opacity-60">opcional</span></label>
            <input
              type="number"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Custos mensais extra (€) <span className="opacity-60">seguros, condomínio…</span></label>
            <input
              type="number"
              value={extraMonthlyCosts}
              onChange={(e) => setExtraMonthlyCosts(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              💥 Pagamento extra mensal (€) <span className="opacity-60">poupe juros e tempo</span>
            </label>
            <input
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-border-subtle bg-secondary px-4 py-2 text-sm font-medium hover:bg-surface-hover"
          >
            <FileText className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-subtle/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" />Prestação</div>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums">{fmt2(basePayment)}</p>
        </div>
        <div className="rounded-xl border border-border-subtle/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-3.5 w-3.5" />Custo total</div>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums">{fmt(totalCost)}</p>
        </div>
        <div className="rounded-xl border border-border-subtle/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertCircle className="h-3.5 w-3.5" />Juros totais</div>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-destructive">{fmt(totalInterest)}</p>
        </div>
        <div className={`rounded-xl border border-border-subtle/60 p-4 ${effortStatus.bg}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">{effortStatus.emoji} Taxa esforço</div>
          <p className={`mt-1 text-xl font-bold font-mono tabular-nums ${effortStatus.color}`}>
            {monthlyIncome > 0 ? `${effortRatio.toFixed(1)}%` : "—"}
          </p>
          <p className={`text-xs ${effortStatus.color}`}>{effortStatus.label}</p>
        </div>
      </div>

      {/* Margem */}
      {monthlyIncome > 0 && (
        <div className="rounded-xl border border-border-subtle/60 bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Custo real mensal</p>
              <p className="text-lg font-bold font-mono tabular-nums">{fmt2(realMonthlyCost)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Margem mensal</p>
              <p className={`text-lg font-bold font-mono tabular-nums ${margin >= 0 ? "text-success" : "text-destructive"}`}>
                {fmt2(margin)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pagamento extra benefícios */}
      {extraPayment > 0 && interestSaved > 0 && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-success" />
            <h3 className="font-semibold text-success">Impacto do pagamento extra</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Juros poupados</p>
              <p className="text-lg font-bold font-mono tabular-nums text-success">{fmt(interestSaved)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tempo poupado</p>
              <p className="text-lg font-bold">{yearsSaved}a {remainderMonths}m</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Novo prazo</p>
              <p className="text-lg font-bold">{Math.floor(extraSchedule.length / 12)}a {extraSchedule.length % 12}m</p>
            </div>
          </div>
        </div>
      )}

      {/* GRÁFICO */}
      <div className="rounded-xl border border-border-subtle/60 bg-card p-5">
        <h3 className="font-semibold mb-3">Evolução da dívida</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: "Ano", position: "insideBottom", offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                labelFormatter={(l) => `Ano ${l}`}
                contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area type="monotone" dataKey="balance" name="Dívida restante" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle/60 bg-card p-5">
        <h3 className="font-semibold mb-3">Juros vs Capital (anual)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                labelFormatter={(l) => `Ano ${l}`}
                contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="interest" name="Juros pagos" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="principal" name="Capital amortizado" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Insights</h3>
          </div>
          <ul className="space-y-2">
            {insights.map((ins, i) => (
              <li key={i} className="text-sm" dangerouslySetInnerHTML={{ __html: ins.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            ))}
          </ul>
        </div>
      )}

      {/* TABELA AMORTIZAÇÃO ANUAL */}
      <div className="rounded-xl border border-border-subtle/60 bg-card p-5">
        <h3 className="font-semibold mb-3">Tabela de Amortização</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2"></th>
                <th className="py-2 pr-2">Ano</th>
                <th className="py-2 pr-2 text-right">Pago</th>
                <th className="py-2 pr-2 text-right">Juros</th>
                <th className="py-2 pr-2 text-right">Capital</th>
                <th className="py-2 text-right">Dívida fim</th>
              </tr>
            </thead>
            <tbody>
              {yearlyTable.map((y) => (
                <>
                  <tr
                    key={y.year}
                    className="border-b border-border-subtle/40 hover:bg-surface-hover/40 cursor-pointer"
                    onClick={() => setExpandedYear(expandedYear === y.year ? null : y.year)}
                  >
                    <td className="py-2 pr-2">
                      {expandedYear === y.year ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="py-2 pr-2 font-medium">{y.year}</td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums">{fmt(y.totalPayment)}</td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums text-destructive">{fmt(y.totalInterest)}</td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums text-success">{fmt(y.totalPrincipal)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{fmt(y.endBalance)}</td>
                  </tr>
                  {expandedYear === y.year &&
                    y.rows.map((r, idx) => (
                      <tr key={`${y.year}-${idx}`} className="bg-muted/30 text-xs">
                        <td></td>
                        <td className="py-1.5 pr-2 pl-4 text-muted-foreground">Mês {r.month}</td>
                        <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{fmt2(r.payment)}</td>
                        <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-destructive">{fmt2(r.interest)}</td>
                        <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-success">{fmt2(r.principal)}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums">{fmt2(r.balance)}</td>
                      </tr>
                    ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SIMULAÇÕES GUARDADAS */}
      {savedSims.length > 0 && (
        <div className="rounded-xl border border-border-subtle/60 bg-card p-5">
          <h3 className="font-semibold mb-3">Simulações guardadas</h3>
          <div className="space-y-2">
            {savedSims.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border-subtle/40 bg-background p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(Number(s.loan_amount))} • {s.annual_rate}% • {s.term_years}a
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleLoad(s)}
                    className="rounded-md px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    Carregar
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MortgageSimulator;
