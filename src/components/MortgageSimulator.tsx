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
  ChevronUp,
  ChevronRight,
  Sparkles,
  PiggyBank,
  Loader2,
  FileText,
  Home,
  FlaskConical,
  RefreshCw,
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
  if (r === 0 || n === 0) return n === 0 ? 0 : principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

const buildSchedule = (
  principal: number,
  annualRate: number,
  years: number,
  extraPayment: number = 0
): AmortRow[] => {
  if (principal <= 0 || years <= 0) return [];
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

interface CurrentCredit {
  id?: string;
  loan_amount: number;
  annual_rate: number;
  term_years: number;
  monthly_payment: number;
}

const MortgageSimulator = ({ onSavedCurrent }: { onSavedCurrent?: () => Promise<void> | void }) => {
  const { user } = useAuth();

  // === CRÉDITO ATUAL (sincroniza com house_data) ===
  const [current, setCurrent] = useState<CurrentCredit>({
    loan_amount: 0,
    annual_rate: 0,
    term_years: 30,
    monthly_payment: 0,
  });
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [savingCurrent, setSavingCurrent] = useState(false);

  // === SIMULAÇÃO LIVRE ===
  const [loanAmount, setLoanAmount] = useState(150000);
  const [annualRate, setAnnualRate] = useState(3.5);
  const [termYears, setTermYears] = useState(30);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [extraMonthlyCosts, setExtraMonthlyCosts] = useState(0);
  const [extraPayment, setExtraPayment] = useState(0);
  const [simName, setSimName] = useState("Simulação 1");
  const [savedSims, setSavedSims] = useState<Simulation[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [simCollapsed, setSimCollapsed] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadCurrent();
    loadSimulations();
  }, [user]);

  const loadCurrent = async () => {
    if (!user) return;
    setLoadingCurrent(true);
    const { data } = await supabase
      .from("house_data")
      .select("id, house_value, down_payment, annual_rate, term_years, monthly_payment")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      const loan = Math.max(0, Number(data.house_value || 0) - Number(data.down_payment || 0));
      setCurrent({
        id: data.id,
        loan_amount: loan,
        annual_rate: Number(data.annual_rate || 0),
        term_years: Number(data.term_years || 30),
        monthly_payment: Number(data.monthly_payment || 0),
      });
    }
    setLoadingCurrent(false);
  };

  const loadSimulations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("mortgage_simulations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setSavedSims(data as Simulation[]);
  };

  const handleSaveCurrent = async () => {
    if (!user) return;
    setSavingCurrent(true);
    try {
      const computedPayment = calcPMT(current.loan_amount, current.annual_rate, current.term_years);
      const payload = {
        annual_rate: current.annual_rate,
        term_years: current.term_years,
        monthly_payment: computedPayment,
      };
      if (current.id) {
        const { error } = await supabase.from("house_data").update(payload).eq("id", current.id);
        if (error) throw error;
      } else {
        const { data: row, error } = await supabase
          .from("house_data")
          .insert({ ...payload, user_id: user.id, house_value: current.loan_amount, down_payment: 0 })
          .select()
          .single();
        if (error) throw error;
        setCurrent((p) => ({ ...p, id: row.id }));
      }
      setCurrent((p) => ({ ...p, monthly_payment: computedPayment }));
      toast.success("Crédito atualizado em Minha Casa");
      if (onSavedCurrent) await onSavedCurrent();
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar");
    } finally {
      setSavingCurrent(false);
    }
  };

  // === CÁLCULOS CRÉDITO ATUAL ===
  const currentSchedule = useMemo(
    () => buildSchedule(current.loan_amount, current.annual_rate, current.term_years, 0),
    [current.loan_amount, current.annual_rate, current.term_years]
  );
  const currentPayment = useMemo(
    () => calcPMT(current.loan_amount, current.annual_rate, current.term_years),
    [current.loan_amount, current.annual_rate, current.term_years]
  );
  const currentTotalCost = currentSchedule.reduce((s, r) => s + r.payment, 0);
  const currentTotalInterest = Math.max(0, currentTotalCost - current.loan_amount);

  // === CÁLCULOS SIMULAÇÃO ===
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
  const totalInterest = Math.max(0, totalCost - loanAmount);
  const realMonthlyCost = basePayment + extraMonthlyCosts;
  const margin = monthlyIncome - realMonthlyCost;
  const effortRatio = monthlyIncome > 0 ? (basePayment / monthlyIncome) * 100 : 0;

  const extraTotalCost = extraSchedule.reduce((s, r) => s + r.payment, 0);
  const extraTotalInterest = Math.max(0, extraTotalCost - loanAmount);
  const interestSaved = totalInterest - extraTotalInterest;
  const monthsSaved = baseSchedule.length - extraSchedule.length;
  const yearsSaved = Math.floor(monthsSaved / 12);
  const remainderMonths = monthsSaved % 12;

  // Comparativo simulação vs atual
  const paymentDelta = basePayment - currentPayment;
  const interestDelta = totalInterest - currentTotalInterest;

  const effortStatus = useMemo(() => {
    if (monthlyIncome === 0)
      return { label: "—", color: "text-muted-foreground", bg: "bg-muted/30", emoji: "💡" };
    if (effortRatio < 30)
      return { label: "Saudável", color: "text-success", bg: "bg-success/10", emoji: "🟢" };
    if (effortRatio < 40)
      return { label: "Atenção", color: "text-warning", bg: "bg-warning/10", emoji: "🟡" };
    return { label: "Risco", color: "text-destructive", bg: "bg-destructive/10", emoji: "🔴" };
  }, [effortRatio, monthlyIncome]);

  const chartData = useMemo(() => {
    const yearly: Record<number, { year: number; balance: number; interest: number; principal: number }> = {};
    baseSchedule.forEach((r) => {
      const yr = r.year;
      if (!yearly[yr]) yearly[yr] = { year: yr, balance: 0, interest: 0, principal: 0 };
      yearly[yr].balance = r.balance;
      yearly[yr].interest += r.interest;
      yearly[yr].principal += r.principal;
    });
    return Object.values(yearly);
  }, [baseSchedule]);

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
      return { year: Number(year), rows, totalPayment, totalInterest, totalPrincipal, endBalance };
    });
  }, [baseSchedule]);

  const insights = useMemo(() => {
    const items: string[] = [];
    if (totalInterest > 0) items.push(`💸 Esta simulação paga **${fmt(totalInterest)}** em juros ao longo de ${termYears} anos.`);
    if (monthlyIncome > 0) items.push(`📊 Consome **${effortRatio.toFixed(1)}%** do seu rendimento mensal.`);
    if (currentPayment > 0 && basePayment > 0) {
      if (paymentDelta < -1) items.push(`✅ Poupa **${fmt(Math.abs(paymentDelta))}/mês** vs o seu crédito atual.`);
      else if (paymentDelta > 1) items.push(`⚠️ Custa mais **${fmt(paymentDelta)}/mês** vs o seu crédito atual.`);
      if (interestDelta < -1) items.push(`🎯 Poupa **${fmt(Math.abs(interestDelta))}** em juros vs o atual.`);
    }
    if (extraPayment > 0 && interestSaved > 0) {
      items.push(`🚀 Com **+${fmt(extraPayment)}/mês**, poupa **${yearsSaved}a ${remainderMonths}m** e **${fmt(interestSaved)}** em juros.`);
    }
    if (margin < 0 && monthlyIncome > 0) {
      items.push(`⚠️ O custo real ultrapassa o seu rendimento em **${fmt(Math.abs(margin))}**.`);
    }
    return items;
  }, [totalInterest, termYears, monthlyIncome, effortRatio, extraPayment, interestSaved, yearsSaved, remainderMonths, margin, basePayment, currentPayment, paymentDelta, interestDelta]);

  const handleSaveSim = async () => {
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

  const copyCurrentToSim = () => {
    if (current.loan_amount <= 0) {
      toast.error("Preencha primeiro o seu crédito atual");
      return;
    }
    setLoanAmount(current.loan_amount);
    setAnnualRate(current.annual_rate);
    setTermYears(current.term_years);
    setSimName("Cenário baseado no atual");
    toast.success("Dados do crédito atual copiados");
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

  const inputCls = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono";
  const labelCls = "text-xs font-medium text-muted-foreground";

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
            <p className="text-sm text-muted-foreground">Compare o seu crédito atual com cenários alternativos</p>
          </div>
        </div>
      </div>

      {/* DUAS COLUNAS: ATUAL vs SIMULAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* === CRÉDITO ATUAL === */}
        <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Home className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">O Seu Crédito Atual</h3>
                <p className="text-xs text-muted-foreground">Sincronizado com Minha Casa</p>
              </div>
            </div>
            <button
              onClick={loadCurrent}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              title="Recarregar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {loadingCurrent ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>Valor financiado (€)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={current.loan_amount === 0 ? "" : current.loan_amount}
                    onChange={(e) => setCurrent((p) => ({ ...p, loan_amount: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                    className={inputCls}
                    placeholder="Ex: 120000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Taxa anual (%)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={current.annual_rate === 0 ? "" : current.annual_rate}
                      onChange={(e) => setCurrent((p) => ({ ...p, annual_rate: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                      className={inputCls}
                      placeholder="Ex: 3.5"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Prazo (anos)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={current.term_years === 0 ? "" : current.term_years}
                      onChange={(e) => setCurrent((p) => ({ ...p, term_years: e.target.value === "" ? 0 : Math.max(1, Math.min(50, Number(e.target.value))) }))}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Resumo do crédito atual */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="rounded-lg bg-card border border-border-subtle/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Prestação</p>
                  <p className="text-sm font-bold font-mono tabular-nums mt-0.5">{fmt2(currentPayment)}</p>
                </div>
                <div className="rounded-lg bg-card border border-border-subtle/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                  <p className="text-sm font-bold font-mono tabular-nums mt-0.5">{fmt(currentTotalCost)}</p>
                </div>
                <div className="rounded-lg bg-card border border-border-subtle/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Juros</p>
                  <p className="text-sm font-bold font-mono tabular-nums text-destructive mt-0.5">{fmt(currentTotalInterest)}</p>
                </div>
              </div>

              <button
                onClick={handleSaveCurrent}
                disabled={savingCurrent}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {savingCurrent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Atualizar em Minha Casa
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Estes dados aparecem automaticamente nos painéis de Esforço e Progresso
              </p>
            </>
          )}
        </div>

        {/* === SIMULE UM NOVO CRÉDITO === */}
        <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setSimCollapsed((v) => !v)}
              className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
              aria-expanded={!simCollapsed}
            >
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <FlaskConical className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold flex items-center gap-1.5">
                  Simule um Novo Crédito
                  {simCollapsed ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  )}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {simCollapsed ? "Clique para expandir" : "Teste cenários sem afetar Minha Casa"}
                </p>
              </div>
            </button>
            {!simCollapsed && (
              <button
                onClick={copyCurrentToSim}
                className="text-[11px] rounded-md px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 font-medium shrink-0"
                title="Copiar dados do crédito atual"
              >
                ← Copiar atual
              </button>
            )}
          </div>

          {!simCollapsed && (
            <>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>Nome da simulação</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className={labelCls}>Valor do empréstimo (€)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={loanAmount === 0 ? "" : loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Taxa anual (%)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={annualRate === 0 ? "" : annualRate}
                      onChange={(e) => setAnnualRate(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Prazo (anos)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={termYears === 0 ? "" : termYears}
                      onChange={(e) => setTermYears(e.target.value === "" ? 0 : Math.max(1, Math.min(50, Number(e.target.value))))}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Rendimento (€) <span className="opacity-60">opc.</span></label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={monthlyIncome === 0 ? "" : monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Custos extra (€) <span className="opacity-60">opc.</span></label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={extraMonthlyCosts === 0 ? "" : extraMonthlyCosts}
                      onChange={(e) => setExtraMonthlyCosts(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>💥 Pagamento extra mensal (€)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={extraPayment === 0 ? "" : extraPayment}
                    onChange={(e) => setExtraPayment(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveSim}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar
                </button>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 rounded-lg border border-border-subtle bg-secondary px-3 py-2 text-sm font-medium hover:bg-surface-hover"
                  title="Exportar CSV"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* DASHBOARD DA SIMULAÇÃO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-subtle/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" />Prestação</div>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums">{fmt2(basePayment)}</p>
          {currentPayment > 0 && (
            <p className={`text-[11px] font-mono mt-0.5 ${paymentDelta < 0 ? "text-success" : paymentDelta > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {paymentDelta > 0 ? "+" : ""}{fmt2(paymentDelta)} vs atual
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border-subtle/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-3.5 w-3.5" />Custo total</div>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums">{fmt(totalCost)}</p>
          {currentTotalCost > 0 && (
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              atual: {fmt(currentTotalCost)}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border-subtle/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertCircle className="h-3.5 w-3.5" />Juros totais</div>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-destructive">{fmt(totalInterest)}</p>
          {currentTotalInterest > 0 && (
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              atual: {fmt(currentTotalInterest)}
            </p>
          )}
        <div className="rounded-xl border border-border-subtle/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertCircle className="h-3.5 w-3.5" />Juros totais</div>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-destructive">{fmt(totalInterest)}</p>
          {currentTotalInterest > 0 && (
            <p className={`text-[11px] font-mono mt-0.5 ${interestDelta < 0 ? "text-success" : interestDelta > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {interestDelta > 0 ? "+" : ""}{fmt(interestDelta)} vs atual
            </p>
          )}
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
        <h3 className="font-semibold mb-3">Evolução da dívida (simulação)</h3>
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
      {yearlyTable.length > 0 && (
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
      )}

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
