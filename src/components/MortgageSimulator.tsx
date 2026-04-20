import { useState, useEffect, useMemo, useRef } from "react";
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
  ChevronLeft,
  Sparkles,
  PiggyBank,
  Loader2,
  FileText,
  Home,
  FlaskConical,
  RefreshCw,
  Upload,
  ScanLine,
  CheckCircle2,
  X,
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

type RateType = "fixed" | "variable" | "mixed";

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
  rate_type?: RateType;
  indexante?: number;
  spread?: number;
  fixed_period_years?: number;
  fixed_rate_initial?: number;
}

interface AmortRow {
  month: number;       // 1..12
  globalMonth: number; // 1..N
  year: number;        // 1..termYears
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  extraPayment: number;
  rateApplied: number; // %
}

const calcPMT = (principal: number, annualRate: number, years: number) => {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0 || n === 0) return n === 0 ? 0 : principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

// Effective annual rate by month index (0-based) for the chosen profile
const rateAtMonth = (
  monthIndex0: number,
  rateType: RateType,
  fixedRate: number,
  fixedPeriodYears: number,
  variableRate: number,
): number => {
  if (rateType === "fixed") return fixedRate;
  if (rateType === "variable") return variableRate;
  // mixed
  return monthIndex0 < fixedPeriodYears * 12 ? fixedRate : variableRate;
};

interface ScheduleParams {
  principal: number;
  termYears: number;
  rateType: RateType;
  fixedRate: number;        // for fixed or initial fixed phase of mixed
  fixedPeriodYears: number; // mixed only
  variableRate: number;     // indexante + spread (variable / 2nd phase mixed)
  extraPayment: number;
}

const buildSchedule = (p: ScheduleParams): AmortRow[] => {
  const { principal, termYears, rateType, fixedRate, fixedPeriodYears, variableRate, extraPayment } = p;
  if (principal <= 0 || termYears <= 0) return [];
  const maxMonths = termYears * 12;
  const rows: AmortRow[] = [];
  let balance = principal;
  let currentRate = rateAtMonth(0, rateType, fixedRate, fixedPeriodYears, variableRate);
  let remainingMonths = maxMonths;
  let payment = calcPMT(balance, currentRate, remainingMonths / 12);

  for (let m = 1; m <= maxMonths && balance > 0.01; m++) {
    const idx0 = m - 1;
    const newRate = rateAtMonth(idx0, rateType, fixedRate, fixedPeriodYears, variableRate);
    if (Math.abs(newRate - currentRate) > 1e-9) {
      // recompute payment for remaining term
      currentRate = newRate;
      remainingMonths = maxMonths - idx0;
      payment = calcPMT(balance, currentRate, remainingMonths / 12);
    }
    const r = currentRate / 100 / 12;
    const interest = balance * r;
    let principalPaid = payment - interest;
    let extra = extraPayment;
    if (principalPaid + extra > balance) {
      extra = Math.max(0, balance - principalPaid);
      if (principalPaid > balance) principalPaid = balance;
    }
    balance -= principalPaid + extra;
    if (balance < 0) balance = 0;
    rows.push({
      month: ((m - 1) % 12) + 1,
      globalMonth: m,
      year: Math.ceil(m / 12),
      payment: payment + extra,
      interest,
      principal: principalPaid,
      balance,
      extraPayment: extra,
      rateApplied: currentRate,
    });
  }
  return rows;
};

interface ExtraExpense {
  name: string;
  value: number;
}

interface CurrentCredit {
  id?: string;
  house_value: number;
  down_payment: number;
  loan_amount: number;
  monthly_income: number;
  extra_expenses: ExtraExpense[];
  annual_rate: number;
  term_years: number;
  monthly_payment: number;
  monthly_payment_status: Record<string, string>;
  rate_type: RateType;
  indexante: number;
  spread: number;
  fixed_period_years: number;
  fixed_rate_initial: number;
}

const MONTH_NAMES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTH_NAMES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface ExtractedDoc {
  loan_amount?: number | null;
  rate_type?: RateType | null;
  annual_rate?: number | null;
  indexante?: number | null;
  indexante_label?: string | null;
  spread?: number | null;
  fixed_period_years?: number | null;
  fixed_rate_initial?: number | null;
  term_years?: number | null;
  monthly_payment?: number | null;
  insurance_notes?: string | null;
  confidence?: number;
  notes?: string | null;
}

const MortgageSimulator = ({ onSavedCurrent }: { onSavedCurrent?: () => Promise<void> | void }) => {
  const { user, profile } = useAuth();

  // === CRÉDITO ATUAL (sincroniza com house_data) ===
  const [current, setCurrent] = useState<CurrentCredit>({
    house_value: 0,
    down_payment: 0,
    loan_amount: 0,
    monthly_income: 0,
    extra_expenses: [],
    annual_rate: 0,
    term_years: 30,
    monthly_payment: 0,
    monthly_payment_status: {},
    rate_type: "fixed",
    indexante: 0,
    spread: 0,
    fixed_period_years: 0,
    fixed_rate_initial: 0,
  });
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [newExtraName, setNewExtraName] = useState("");
  const [newExtraValue, setNewExtraValue] = useState("");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // === SIMULAÇÃO LIVRE ===
  const [loanAmount, setLoanAmount] = useState(150000);
  const [termYears, setTermYears] = useState(30);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [extraMonthlyCosts, setExtraMonthlyCosts] = useState(0);
  const [extraPayment, setExtraPayment] = useState(0);
  const [simName, setSimName] = useState("Simulação 1");

  // Tipo de taxa
  const [rateType, setRateType] = useState<RateType>("fixed");
  const [annualRate, setAnnualRate] = useState(3.5);          // taxa fixa (fixed)
  const [indexante, setIndexante] = useState(2.5);            // Euribor (variable/mixed phase 2)
  const [spread, setSpread] = useState(1.0);                  // spread banco
  const [fixedPeriodYears, setFixedPeriodYears] = useState(5);// mixed: anos fixos
  const [fixedRateInitial, setFixedRateInitial] = useState(3.0); // mixed: taxa fixa fase 1

  const variableRate = useMemo(() => indexante + spread, [indexante, spread]);
  // Effective rate used during fixed-rate-only flow ("fixed") — and what we save in annual_rate column for back-compat
  const effectiveBaseRate = useMemo(() => {
    if (rateType === "fixed") return annualRate;
    if (rateType === "variable") return variableRate;
    return fixedRateInitial; // mixed → começa fixo
  }, [rateType, annualRate, variableRate, fixedRateInitial]);

  const [savedSims, setSavedSims] = useState<Simulation[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [simCollapsed, setSimCollapsed] = useState(false);
  const [tableCollapsed, setTableCollapsed] = useState(true);

  // === UPLOAD ESCRITURA ===
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedDoc | null>(null);
  const [extractedFileName, setExtractedFileName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    loadCurrent();
    loadSimulations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Keep loan_amount derived from house_value - down_payment
  useEffect(() => {
    setCurrent((p) => {
      const next = Math.max(0, p.house_value - p.down_payment);
      return next === p.loan_amount ? p : { ...p, loan_amount: next };
    });
  }, [current.house_value, current.down_payment]);

  const loadCurrent = async () => {
    if (!user) return;
    setLoadingCurrent(true);
    const { data } = await supabase
      .from("house_data")
      .select("id, house_value, down_payment, monthly_income, extra_expenses, annual_rate, term_years, monthly_payment, monthly_payment_status, rate_type, indexante, spread, fixed_period_years, fixed_rate_initial")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      const houseValue = Number(data.house_value || 0);
      const downPayment = Number((data as any).down_payment || 0);
      const loan = Math.max(0, houseValue - downPayment);
      const d = data as any;
      setCurrent({
        id: data.id,
        house_value: houseValue,
        down_payment: downPayment,
        loan_amount: loan,
        monthly_income: Number(d.monthly_income || 0),
        extra_expenses: (d.extra_expenses as ExtraExpense[]) || [],
        annual_rate: Number(data.annual_rate || 0),
        term_years: Number(data.term_years || 30),
        monthly_payment: Number(data.monthly_payment || 0),
        monthly_payment_status: (d.monthly_payment_status as Record<string, string>) || {},
        rate_type: (d.rate_type as RateType) || "fixed",
        indexante: Number(d.indexante || 0),
        spread: Number(d.spread || 0),
        fixed_period_years: Number(d.fixed_period_years || 0),
        fixed_rate_initial: Number(d.fixed_rate_initial || 0),
      });
    }
    setLoadingCurrent(false);
  };

  const addExtraExpense = () => {
    if (!newExtraName.trim()) return;
    const val = parseFloat(newExtraValue.replace(",", ".")) || 0;
    setCurrent((p) => ({ ...p, extra_expenses: [...p.extra_expenses, { name: newExtraName.trim(), value: val }] }));
    setNewExtraName("");
    setNewExtraValue("");
  };

  const removeExtraExpense = (idx: number) => {
    setCurrent((p) => ({ ...p, extra_expenses: p.extra_expenses.filter((_, i) => i !== idx) }));
  };

  const togglePaymentStatus = async (year: number, month: number) => {
    if (!user || !current.id) {
      toast.error("Guarde primeiro o crédito atual");
      return;
    }
    const key = `${year}-${month}`;
    const next = current.monthly_payment_status[key] === "pago" ? "pendente" : "pago";
    const newStatus = { ...current.monthly_payment_status, [key]: next };
    setCurrent((p) => ({ ...p, monthly_payment_status: newStatus }));
    const { error } = await supabase
      .from("house_data")
      .update({ monthly_payment_status: newStatus as any })
      .eq("id", current.id);
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      if (onSavedCurrent) await onSavedCurrent();
    }
  };

  const loadSimulations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("mortgage_simulations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setSavedSims(data as unknown as Simulation[]);
  };

  // Resolve "taxa de partida" used for headline payment & summaries
  const currentVariableRate = current.indexante + current.spread;
  const currentEffectiveStartRate =
    current.rate_type === "fixed"
      ? current.annual_rate
      : current.rate_type === "variable"
      ? currentVariableRate
      : current.fixed_rate_initial;

  const handleSaveCurrent = async () => {
    if (!user) return;
    setSavingCurrent(true);
    try {
      const loanAmount = Math.max(0, current.house_value - current.down_payment);
      const computedPayment = calcPMT(loanAmount, currentEffectiveStartRate, current.term_years);
      const payload: any = {
        house_value: current.house_value,
        down_payment: current.down_payment,
        monthly_income: current.monthly_income,
        extra_expenses: current.extra_expenses,
        annual_rate:
          current.rate_type === "fixed" ? current.annual_rate : currentEffectiveStartRate,
        term_years: current.term_years,
        monthly_payment: computedPayment,
        rate_type: current.rate_type,
        indexante: current.indexante,
        spread: current.spread,
        fixed_period_years: current.fixed_period_years,
        fixed_rate_initial: current.fixed_rate_initial,
      };
      if (current.id) {
        const { error } = await supabase.from("house_data").update(payload).eq("id", current.id);
        if (error) throw error;
      } else {
        const { data: row, error } = await supabase
          .from("house_data")
          .insert({ ...payload, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        setCurrent((p) => ({ ...p, id: row.id }));
      }
      setCurrent((p) => ({ ...p, loan_amount: loanAmount, monthly_payment: computedPayment }));
      toast.success("Dados da casa e crédito guardados");
      if (onSavedCurrent) await onSavedCurrent();
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar");
    } finally {
      setSavingCurrent(false);
    }
  };

  // === CÁLCULOS CRÉDITO ATUAL (respeita o tipo de taxa) ===
  const currentSchedule = useMemo(
    () =>
      buildSchedule({
        principal: current.loan_amount,
        termYears: current.term_years,
        rateType: current.rate_type,
        fixedRate:
          current.rate_type === "mixed" ? current.fixed_rate_initial : current.annual_rate,
        fixedPeriodYears: current.fixed_period_years,
        variableRate: currentVariableRate,
        extraPayment: 0,
      }),
    [
      current.loan_amount,
      current.annual_rate,
      current.term_years,
      current.rate_type,
      current.indexante,
      current.spread,
      current.fixed_period_years,
      current.fixed_rate_initial,
      currentVariableRate,
    ]
  );
  const currentPayment = useMemo(
    () => calcPMT(current.loan_amount, currentEffectiveStartRate, current.term_years),
    [current.loan_amount, currentEffectiveStartRate, current.term_years]
  );
  const currentTotalCost = currentSchedule.reduce((s, r) => s + r.payment, 0);
  const currentTotalInterest = Math.max(0, currentTotalCost - current.loan_amount);

  // === CÁLCULOS SIMULAÇÃO ===
  const baseSchedule = useMemo(
    () =>
      buildSchedule({
        principal: loanAmount,
        termYears,
        rateType,
        fixedRate: rateType === "mixed" ? fixedRateInitial : annualRate,
        fixedPeriodYears,
        variableRate,
        extraPayment: 0,
      }),
    [loanAmount, termYears, rateType, annualRate, fixedRateInitial, fixedPeriodYears, variableRate]
  );
  const extraSchedule = useMemo(
    () =>
      buildSchedule({
        principal: loanAmount,
        termYears,
        rateType,
        fixedRate: rateType === "mixed" ? fixedRateInitial : annualRate,
        fixedPeriodYears,
        variableRate,
        extraPayment,
      }),
    [loanAmount, termYears, rateType, annualRate, fixedRateInitial, fixedPeriodYears, variableRate, extraPayment]
  );

  // "first" payment shown — for mixed shows fase fixa
  const basePayment = baseSchedule[0]?.payment ?? 0;
  // payment after rate change (mixed phase 2) for display
  const variablePhasePayment = useMemo(() => {
    if (rateType !== "mixed") return null;
    const switchMonth = fixedPeriodYears * 12;
    return baseSchedule.find((r) => r.globalMonth > switchMonth)?.payment ?? null;
  }, [rateType, fixedPeriodYears, baseSchedule]);

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
    const yearly: Record<number, { year: number; balance: number; interest: number; principal: number; payment: number }> = {};
    baseSchedule.forEach((r) => {
      const yr = r.year;
      if (!yearly[yr]) yearly[yr] = { year: yr, balance: 0, interest: 0, principal: 0, payment: 0 };
      yearly[yr].balance = r.balance;
      yearly[yr].interest += r.interest;
      yearly[yr].principal += r.principal;
      yearly[yr].payment = r.payment; // last of the year
    });
    return Object.values(yearly);
  }, [baseSchedule]);

  const groupByYear = (schedule: AmortRow[]) => {
    const grouped: Record<number, AmortRow[]> = {};
    schedule.forEach((r) => {
      if (!grouped[r.year]) grouped[r.year] = [];
      grouped[r.year].push(r);
    });
    return Object.entries(grouped).map(([year, rows]) => {
      const totalPayment = rows.reduce((s, r) => s + r.payment, 0);
      const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
      const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
      const endBalance = rows[rows.length - 1].balance;
      const rateAvg = rows.reduce((s, r) => s + r.rateApplied, 0) / rows.length;
      return { year: Number(year), rows, totalPayment, totalInterest, totalPrincipal, endBalance, rateAvg };
    });
  };
  const yearlyTable = useMemo(() => groupByYear(baseSchedule), [baseSchedule]);
  const currentYearlyTable = useMemo(() => groupByYear(currentSchedule), [currentSchedule]);

  const insights = useMemo(() => {
    const items: string[] = [];
    if (totalInterest > 0)
      items.push(`💸 Esta simulação paga **${fmt(totalInterest)}** em juros ao longo de ${termYears} anos.`);
    if (rateType === "mixed" && variablePhasePayment != null) {
      const delta = variablePhasePayment - basePayment;
      const sign = delta > 0 ? "aumenta" : "diminui";
      items.push(
        `🔁 Após **${fixedPeriodYears} anos**, a taxa muda para variável (${variableRate.toFixed(2)}%) e a prestação ${sign} para **${fmt2(variablePhasePayment)}**.`
      );
    }
    if (rateType === "variable") {
      items.push(`📌 Taxa variável assumida constante = indexante (${indexante.toFixed(2)}%) + spread (${spread.toFixed(2)}%) = **${variableRate.toFixed(2)}%**.`);
    }
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
  }, [totalInterest, termYears, monthlyIncome, effortRatio, extraPayment, interestSaved, yearsSaved, remainderMonths, margin, basePayment, currentPayment, paymentDelta, interestDelta, rateType, variablePhasePayment, fixedPeriodYears, variableRate, indexante, spread]);

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
      annual_rate: effectiveBaseRate,
      term_years: termYears,
      monthly_income: monthlyIncome,
      extra_monthly_costs: extraMonthlyCosts,
      extra_payment: extraPayment,
      rate_type: rateType,
      indexante,
      spread,
      fixed_period_years: rateType === "mixed" ? fixedPeriodYears : 0,
      fixed_rate_initial: rateType === "mixed" ? fixedRateInitial : 0,
    } as any);
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
    setTermYears(s.term_years);
    setMonthlyIncome(Number(s.monthly_income));
    setExtraMonthlyCosts(Number(s.extra_monthly_costs));
    setExtraPayment(Number(s.extra_payment));
    const rt: RateType = (s.rate_type as RateType) || "fixed";
    setRateType(rt);
    setIndexante(Number(s.indexante ?? 0));
    setSpread(Number(s.spread ?? 0));
    setFixedPeriodYears(Number(s.fixed_period_years ?? 0));
    setFixedRateInitial(Number(s.fixed_rate_initial ?? 0));
    if (rt === "fixed") setAnnualRate(Number(s.annual_rate));
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
    setRateType("fixed");
    setAnnualRate(current.annual_rate);
    setTermYears(current.term_years);
    setSimName("Cenário baseado no atual");
    toast.success("Dados do crédito atual copiados");
  };

  const exportCSV = () => {
    const header = "Mês,Ano,Taxa %,Prestação,Juros,Capital,Pagamento Extra,Dívida Restante\n";
    const rows = baseSchedule
      .map((r, i) => `${i + 1},${r.year},${r.rateApplied.toFixed(3)},${r.payment.toFixed(2)},${r.interest.toFixed(2)},${r.principal.toFixed(2)},${r.extraPayment.toFixed(2)},${r.balance.toFixed(2)}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${simName || "simulacao"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // === UPLOAD ESCRITURA ===
  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;

    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato não suportado. Use PDF, JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande (máx 10 MB).");
      return;
    }

    setUploading(true);
    setExtracted(null);
    setExtractedFileName(file.name);

    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const idx = result.indexOf(",");
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("extract-mortgage-doc", {
        body: { fileBase64, mimeType: file.type },
      });

      if (error) {
        const msg = (error as any)?.message || "Erro ao processar documento";
        toast.error(msg);
        setExtracted(null);
        return;
      }
      const ex = (data as any)?.data as ExtractedDoc | undefined;
      if (!ex) {
        toast.error("Não foi possível extrair dados.");
        return;
      }
      setExtracted(ex);
      toast.success("Dados extraídos. Reveja e confirme abaixo.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const applyExtracted = () => {
    if (!extracted) return;
    if (extracted.loan_amount && extracted.loan_amount > 0) setLoanAmount(extracted.loan_amount);
    if (extracted.term_years && extracted.term_years > 0) setTermYears(extracted.term_years);
    const rt = (extracted.rate_type as RateType) || "fixed";
    setRateType(rt);
    if (rt === "fixed" && extracted.annual_rate != null) setAnnualRate(extracted.annual_rate);
    if (rt === "variable") {
      if (extracted.indexante != null) setIndexante(extracted.indexante);
      if (extracted.spread != null) setSpread(extracted.spread);
    }
    if (rt === "mixed") {
      if (extracted.fixed_rate_initial != null) setFixedRateInitial(extracted.fixed_rate_initial);
      if (extracted.fixed_period_years != null) setFixedPeriodYears(extracted.fixed_period_years);
      if (extracted.indexante != null) setIndexante(extracted.indexante);
      if (extracted.spread != null) setSpread(extracted.spread);
    }
    setSimName(`Escritura ${extractedFileName.replace(/\.[^.]+$/, "")}`.slice(0, 100));
    toast.success("Dados aplicados ao simulador");
    setExtracted(null);
    setExtractedFileName("");
  };

  const updateExtractedField = <K extends keyof ExtractedDoc>(key: K, value: ExtractedDoc[K]) => {
    setExtracted((prev) => (prev ? { ...prev, [key]: value } : prev));
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

      {/* PRESTAÇÃO ATUAL — estado de pagamento */}
      {!loadingCurrent && current.loan_amount > 0 && (() => {
        const loanStart = profile?.plan_started_at ? new Date(profile.plan_started_at) : new Date();
        const monthsSinceStart = Math.max(
          0,
          (selectedYear - loanStart.getFullYear()) * 12 + (selectedMonth - loanStart.getMonth())
        );
        const variableRate = current.indexante + current.spread;
        const rateForSelected = rateAtMonth(
          monthsSinceStart,
          current.rate_type,
          current.rate_type === "mixed" ? current.fixed_rate_initial : current.annual_rate,
          current.fixed_period_years,
          variableRate
        );
        const paymentForSelected = calcPMT(current.loan_amount, rateForSelected, current.term_years);
        const selKey = `${selectedYear}-${selectedMonth}`;
        const isSelectedPaid = current.monthly_payment_status[selKey] === "pago";

        return (
        <div className="rounded-xl border border-border-subtle/60 bg-card p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                Prestação de {MONTH_NAMES_FULL[selectedMonth]} {selectedYear}
              </p>
              <p className="text-xl font-semibold font-mono tabular-nums">{fmt2(paymentForSelected)}</p>
              {current.rate_type !== "fixed" && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Taxa aplicada: <span className="font-mono">{rateForSelected.toFixed(3)}%</span>
                  {current.rate_type === "mixed" && monthsSinceStart < current.fixed_period_years * 12 && " (fase fixa)"}
                  {current.rate_type === "mixed" && monthsSinceStart >= current.fixed_period_years * 12 && " (fase variável)"}
                </p>
              )}
            </div>
            <button
              onClick={() => togglePaymentStatus(selectedYear, selectedMonth)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                isSelectedPaid
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-warning/10 text-warning-foreground border-warning/20 text-yellow-600"
              }`}
            >
              {isSelectedPaid ? "✅ Paga" : "⏳ Pendente"}
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <button
                onClick={() => setCalendarYear((y) => y - 1)}
                className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold min-w-[3rem] text-center">{calendarYear}</span>
              <button
                onClick={() => setCalendarYear((y) => y + 1)}
                className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-1.5">
              {MONTH_NAMES_SHORT.map((name, i) => {
                const key = `${calendarYear}-${i}`;
                const st = current.monthly_payment_status[key];
                const isPast = calendarYear < new Date().getFullYear() ||
                  (calendarYear === new Date().getFullYear() && i <= new Date().getMonth());
                const isSelected = calendarYear === selectedYear && i === selectedMonth;
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedMonth(i); setSelectedYear(calendarYear); }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                        : st === "pago"
                        ? "bg-success/15 text-success"
                        : isPast
                        ? "bg-warning/10 text-yellow-600"
                        : "bg-secondary text-muted-foreground"
                    }`}
                    title={`${name} — ${st === "pago" ? "Paga" : "Pendente"}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        );
      })()}

      {/* CRÉDITO ATUAL */}
      <div className="grid grid-cols-1 gap-4">
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
              {/* === DADOS DA CASA === */}
              <div className="rounded-lg border border-border-subtle/60 bg-card/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Home className="h-3.5 w-3.5 text-muted-foreground" />
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados da casa</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Valor da casa (€)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={current.house_value === 0 ? "" : current.house_value}
                      onChange={(e) => setCurrent((p) => ({ ...p, house_value: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                      className={inputCls}
                      placeholder="Ex: 200000"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Valor pago na entrada (€)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={current.down_payment === 0 ? "" : current.down_payment}
                      onChange={(e) => setCurrent((p) => ({ ...p, down_payment: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                      className={inputCls}
                      placeholder="Ex: 20000"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Rendimento mensal (€)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={current.monthly_income === 0 ? "" : current.monthly_income}
                      onChange={(e) => setCurrent((p) => ({ ...p, monthly_income: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                      className={inputCls}
                      placeholder="Ex: 2400"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Valor financiado (€) <span className="text-[10px] opacity-60">(automático)</span></label>
                    <input
                      type="text"
                      readOnly
                      value={fmt(current.loan_amount)}
                      className={`${inputCls} bg-muted/50 cursor-not-allowed`}
                    />
                  </div>
                </div>

                {/* Despesas adicionais */}
                <div className="pt-2 border-t border-border-subtle/40">
                  <p className={`${labelCls} mb-2`}>Despesas adicionais da casa <span className="opacity-60">(IMI, seguros, condomínio…)</span></p>
                  {current.extra_expenses.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {current.extra_expenses.map((extra, i) => (
                        <div key={i} className="flex items-center gap-2 bg-secondary rounded-md px-2.5 py-1.5">
                          <span className="text-xs text-foreground flex-1">{extra.name}</span>
                          <span className="text-xs font-mono font-semibold">{fmt(extra.value)}/mês</span>
                          <button onClick={() => removeExtraExpense(i)} className="text-muted-foreground hover:text-destructive">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Nome (ex: IMI)"
                      value={newExtraName}
                      onChange={(e) => setNewExtraName(e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="€"
                      value={newExtraValue}
                      onChange={(e) => setNewExtraValue(e.target.value)}
                      className="w-20 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={addExtraExpense}
                      className="rounded-md bg-primary px-2.5 py-1.5 text-primary-foreground hover:opacity-90"
                      title="Adicionar despesa"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">

                {/* Tipo de taxa */}
                <div>
                  <label className={labelCls}>Tipo de taxa</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["fixed","variable","mixed"] as RateType[]).map((rt) => {
                      const lbl = rt === "fixed" ? "Fixa" : rt === "variable" ? "Variável" : "Mista";
                      const active = current.rate_type === rt;
                      return (
                        <button
                          key={rt}
                          type="button"
                          onClick={() => setCurrent((p) => ({ ...p, rate_type: rt }))}
                          className={`rounded-md px-2 py-1.5 text-xs font-medium border transition-colors ${
                            active
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-card border-border-subtle/60 text-foreground hover:bg-surface-hover"
                          }`}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Campos condicionais ao tipo de taxa */}
                {current.rate_type === "fixed" && (
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
                )}

                {current.rate_type === "variable" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Indexante (%)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.001"
                          value={current.indexante === 0 ? "" : current.indexante}
                          onChange={(e) => setCurrent((p) => ({ ...p, indexante: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                          className={inputCls}
                          placeholder="Ex: 2.5"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Spread (%)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.001"
                          value={current.spread === 0 ? "" : current.spread}
                          onChange={(e) => setCurrent((p) => ({ ...p, spread: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                          className={inputCls}
                          placeholder="Ex: 1.0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Taxa atual (%)</label>
                        <input
                          type="number"
                          value={currentVariableRate.toFixed(3)}
                          readOnly
                          className={`${inputCls} bg-muted/50 cursor-not-allowed`}
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
                  </>
                )}

                {current.rate_type === "mixed" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Taxa fixa inicial (%)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={current.fixed_rate_initial === 0 ? "" : current.fixed_rate_initial}
                          onChange={(e) => setCurrent((p) => ({ ...p, fixed_rate_initial: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                          className={inputCls}
                          placeholder="Ex: 3.0"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Anos da fase fixa</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={current.fixed_period_years === 0 ? "" : current.fixed_period_years}
                          onChange={(e) => setCurrent((p) => ({ ...p, fixed_period_years: e.target.value === "" ? 0 : Math.max(0, Math.min(current.term_years, Number(e.target.value))) }))}
                          className={inputCls}
                          placeholder="Ex: 5"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Indexante (%)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.001"
                          value={current.indexante === 0 ? "" : current.indexante}
                          onChange={(e) => setCurrent((p) => ({ ...p, indexante: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                          className={inputCls}
                          placeholder="Ex: 2.5"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Spread (%)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.001"
                          value={current.spread === 0 ? "" : current.spread}
                          onChange={(e) => setCurrent((p) => ({ ...p, spread: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) }))}
                          className={inputCls}
                          placeholder="Ex: 1.0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Prazo total (anos)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={current.term_years === 0 ? "" : current.term_years}
                        onChange={(e) => setCurrent((p) => ({ ...p, term_years: e.target.value === "" ? 0 : Math.max(1, Math.min(50, Number(e.target.value))) }))}
                        className={inputCls}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Fase 1: <strong>{current.fixed_rate_initial.toFixed(2)}%</strong> durante {current.fixed_period_years} anos.
                      Fase 2: <strong>{currentVariableRate.toFixed(3)}%</strong> (indexante + spread) nos restantes {Math.max(0, current.term_years - current.fixed_period_years)} anos.
                    </p>
                  </>
                )}
              </div>

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

              {currentYearlyTable.length > 0 && (
                <div className="mt-4 rounded-xl border border-border-subtle/60 bg-card overflow-hidden">
                  <button
                    onClick={() => setTableCollapsed((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Plano de amortização (mês a mês)
                    </span>
                    {tableCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>

                  {!tableCollapsed && (
                    <div className="border-t border-border-subtle/60 max-h-[480px] overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40 sticky top-0">
                          <tr className="text-left">
                            <th className="px-3 py-2 font-medium text-muted-foreground">Ano / Mês</th>
                            <th className="px-3 py-2 font-medium text-muted-foreground text-right">Taxa</th>
                            <th className="px-3 py-2 font-medium text-muted-foreground text-right">Prestação</th>
                            <th className="px-3 py-2 font-medium text-muted-foreground text-right">Juros</th>
                            <th className="px-3 py-2 font-medium text-muted-foreground text-right">Capital</th>
                            <th className="px-3 py-2 font-medium text-muted-foreground text-right">Dívida</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentYearlyTable.map((y) => (
                            <React.Fragment key={`y-${y.year}`}>
                              <tr
                                className="bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors border-t border-border-subtle/40"
                                onClick={() => setExpandedYear(expandedYear === y.year ? null : y.year)}
                              >
                                <td className="px-3 py-2 font-semibold">
                                  <span className="inline-flex items-center gap-1">
                                    {expandedYear === y.year ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    Ano {y.year}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums">{y.rateAvg.toFixed(2)}%</td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(y.totalPayment)}</td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums text-destructive">{fmt(y.totalInterest)}</td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums text-primary">{fmt(y.totalPrincipal)}</td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(y.endBalance)}</td>
                              </tr>
                              {expandedYear === y.year &&
                                y.rows.map((r, idx) => (
                                  <tr key={`m-${y.year}-${idx}`} className="border-t border-border-subtle/30">
                                    <td className="px-3 py-1.5 pl-8 text-muted-foreground">Mês {idx + 1}</td>
                                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted-foreground">{r.rateApplied.toFixed(3)}%</td>
                                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">{fmt2(r.payment)}</td>
                                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-destructive">{fmt2(r.interest)}</td>
                                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-primary">{fmt2(r.principal)}</td>
                                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">{fmt2(r.balance)}</td>
                                  </tr>
                                ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>

    </div>
  );
};

export default MortgageSimulator;
