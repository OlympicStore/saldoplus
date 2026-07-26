import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Sparkles, Search, Receipt, ChevronRight } from "lucide-react";
import type { BillStatus, MonthlyBillRecord, BillAttachment, FixedExpense } from "@/types/expense";
import { BillCard } from "./central-contas/BillCard";
import { BillDetailDialog } from "./central-contas/BillDetailDialog";
import { getBillIcon } from "./central-contas/billIcons";
import { OtherDocuments } from "./central-contas/OtherDocuments";
import { useNavigate } from "react-router-dom";


const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

const normalize = (n: string) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

interface Props {
  fixedExpenses: FixedExpense[];
  billNames: string[];
  records: MonthlyBillRecord[];
  attachments: BillAttachment[];
  selectedMonth: number;
  selectedYear: number;
  onUpdate: (bill: string, month: number, status: BillStatus, year: number) => void;
  onAttach: (bill: string, month: number, year: number, file: File) => void;
  onRemoveAttachment: (bill: string, month: number, year: number) => void;
  onAddBill: (expense: FixedExpense) => void;
  onRemoveBill: (id: string) => void;
  onUpdateFixed: (id: string, patch: Partial<FixedExpense>) => void;
  onUpdateFixedMonthly: (id: string, month: number, field: "value" | "responsible" | "paid", val: number | string | null | boolean) => void;
}

export const CentralContas = ({
  fixedExpenses, billNames, records, attachments,
  selectedMonth, selectedYear,
  onUpdate, onAttach, onRemoveAttachment,
  onAddBill, onRemoveBill, onUpdateFixed, onUpdateFixedMonthly,
}: Props) => {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"fixed" | "variable">("variable");
  const [newDay, setNewDay] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  const yearRecords = useMemo(() => records.filter(r => r.year === selectedYear), [records, selectedYear]);

  const getStatus = (bill: string, month: number): BillStatus => {
    const nb = normalize(bill);
    return yearRecords.find(r => normalize(r.bill) === nb && r.month === month)?.status ?? "pendente";
  };

  const filtered = useMemo(() => {
    const q = normalize(search);
    return fixedExpenses.filter(e => !q || normalize(e.item).includes(q));
  }, [fixedExpenses, search]);

  // Summary cards for current month
  const summary = useMemo(() => {
    let pending = 0, paid = 0, overdue = 0;
    let pendingSum = 0, paidSum = 0, overdueSum = 0;
    for (const e of fixedExpenses) {
      const st = getStatus(e.item, selectedMonth);
      const val = e.monthlyValues[selectedMonth] ?? 0;
      if (st === "paga") { paid++; paidSum += val; }
      else if (st === "divida") { overdue++; overdueSum += val; }
      else { pending++; pendingSum += val; }
    }
    return { pending, paid, overdue, pendingSum, paidSum, overdueSum };
  }, [fixedExpenses, yearRecords, selectedMonth]);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name || billNames.includes(name)) return;
    onAddBill({
      id: crypto.randomUUID(),
      item: name,
      dueDay: newDay,
      account: "",
      valueType: newType,
      monthlyValues: {},
      monthlyResponsible: {},
      monthlyPaid: {},
    });
    setNewName(""); setNewDay(1); setNewType("variable"); setShowAdd(false);
  };

  const selected = selectedBillId ? fixedExpenses.find(e => e.id === selectedBillId) ?? null : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Central de Contas</h1>
          <p className="text-sm text-text-muted mt-1">As tuas contas recorrentes e faturas num só sítio.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-95 transition"
        >
          <Plus className="h-4 w-4" /> Adicionar conta
        </button>
      </div>

      {/* AI hint */}
      <button
        onClick={() => navigate("/app?tab=assistente")}
        className="w-full text-left mb-6 group"
      >
        <div className="rounded-3xl bg-gradient-to-r from-primary/8 via-primary/5 to-transparent border border-primary/20 p-4 sm:p-5 flex items-center gap-4 hover:from-primary/12 transition-all">
          <span className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Atualiza contas por texto</p>
            <p className="text-xs text-text-muted mt-0.5 truncate">
              Diz ao assistente: <span className="text-foreground">«Água 42€»</span> · <span className="text-foreground">«Paguei a luz 68€»</span>
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-primary transition-colors" />
        </div>
      </button>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SummaryCard label="A pagar" count={summary.pending} sum={summary.pendingSum} tone="pending" />
        <SummaryCard label="Pagas" count={summary.paid} sum={summary.paidSum} tone="paid" />
        <SummaryCard label="Em atraso" count={summary.overdue} sum={summary.overdueSum} tone="overdue" />
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Procurar conta..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-surface border border-border-subtle/60 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Add form */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-3xl border border-border-subtle/60 shadow-card p-5 mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Nova conta</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block mb-1.5">Nome</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Água, Netflix..."
                className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block mb-1.5">Dia de vencimento</label>
              <input type="number" min={1} max={31} value={newDay} onChange={e => setNewDay(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <TypeChip active={newType === "fixed"} onClick={() => setNewType("fixed")}
                title="Valor fixo" subtitle="Netflix, seguro, ginásio" />
              <TypeChip active={newType === "variable"} onClick={() => setNewType("variable")}
                title="Valor variável" subtitle="Água, luz, gás" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowAdd(false); setNewName(""); }}
              className="px-4 py-2 rounded-full text-sm text-text-muted hover:bg-surface-hover transition-colors">Cancelar</button>
            <button onClick={handleAdd}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">Adicionar</button>
          </div>
        </motion.div>
      )}

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-3xl border border-dashed border-border-subtle/70 p-10 text-center">
          <span className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center text-primary mb-3">
            <Receipt className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-foreground">Ainda não tens contas registadas</p>
          <p className="text-xs text-text-muted mt-1">Adiciona a primeira e passa a acompanhar todos os meses num só sítio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(exp => {
            const status = getStatus(exp.item, selectedMonth);
            return (
              <BillCard
                key={exp.id}
                expense={exp}
                status={status}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onOpen={() => setSelectedBillId(exp.id)}
                onUpdateStatus={(st) => onUpdate(exp.item, selectedMonth, st, selectedYear)}
                onUpdateValue={(v) => onUpdateFixedMonthly(exp.id, selectedMonth, "value", v)}
              />
            );
          })}
        </div>
      )}

      {/* Other documents (garantias, faturas avulsas, etc.) */}
      <OtherDocuments />

      {/* Detail dialog */}
      {selected && (
        <BillDetailDialog
          expense={selected}
          records={yearRecords}
          attachments={attachments}
          selectedYear={selectedYear}
          onClose={() => setSelectedBillId(null)}
          onUpdateStatus={(month, st) => onUpdate(selected.item, month, st, selectedYear)}
          onUpdateValue={(month, v) => onUpdateFixedMonthly(selected.id, month, "value", v)}
          onAttach={(month, file) => onAttach(selected.item, month, selectedYear, file)}
          onRemoveAttachment={(month) => onRemoveAttachment(selected.item, month, selectedYear)}
          onUpdateFixed={(patch) => onUpdateFixed(selected.id, patch)}
          onDelete={() => { onRemoveBill(selected.id); setSelectedBillId(null); }}
        />
      )}
    </motion.div>

  );
};

function SummaryCard({ label, count, sum, tone }: { label: string; count: number; sum: number; tone: "pending"|"paid"|"overdue" }) {
  const toneMap = {
    pending: "text-status-pending bg-[hsl(var(--status-pending)/0.12)]",
    paid: "text-status-paid bg-[hsl(var(--status-paid)/0.12)]",
    overdue: "text-status-negative bg-[hsl(var(--status-negative)/0.12)]",
  } as const;
  return (
    <div className="bg-surface rounded-3xl border border-border-subtle/60 shadow-card p-4">
      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${toneMap[tone]}`}>
        {label}
      </div>
      <p className="text-xl sm:text-2xl font-bold text-foreground mt-2 font-mono tabular-nums">{count}</p>
      <p className="text-[11px] text-text-muted mt-0.5 font-mono tabular-nums truncate">{fmt(sum)}</p>
    </div>
  );
}

function TypeChip({ active, onClick, title, subtitle }: { active: boolean; onClick: () => void; title: string; subtitle: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-left rounded-2xl border p-3 transition-all ${
        active ? "border-primary bg-primary/8" : "border-border-subtle/60 bg-background hover:bg-surface-hover"
      }`}>
      <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{title}</p>
      <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>
    </button>
  );
}
