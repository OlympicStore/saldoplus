import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Paperclip, FileCheck, Trash2, CalendarDays, TrendingUp, ArrowUp, ArrowDown, Clock, Edit3, Save, Upload } from "lucide-react";
import type { BillStatus, MonthlyBillRecord, BillAttachment, FixedExpense } from "@/types/expense";
import { getBillIcon } from "./billIcons";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTH_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const STATUS_META: Record<BillStatus, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-[hsl(var(--status-pending)/0.15)] text-[hsl(var(--status-pending))]" },
  paga: { label: "Pago", className: "bg-[hsl(var(--status-paid)/0.15)] text-[hsl(var(--status-paid))]" },
  divida: { label: "Em atraso", className: "bg-[hsl(var(--status-negative)/0.15)] text-[hsl(var(--status-negative))]" },
};

const normalize = (n: string) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

interface Props {
  expense: FixedExpense;
  records: MonthlyBillRecord[];
  attachments: BillAttachment[];
  selectedYear: number;
  onClose: () => void;
  onUpdateStatus: (month: number, st: BillStatus) => void;
  onUpdateValue: (month: number, value: number) => void;
  onAttach: (month: number, file: File) => void;
  onRemoveAttachment: (month: number) => void;
  onUpdateFixed: (patch: Partial<FixedExpense>) => void;
  onDelete: () => void;
}

export function BillDetailDialog({
  expense, records, attachments, selectedYear,
  onClose, onUpdateStatus, onUpdateValue, onAttach, onRemoveAttachment, onUpdateFixed, onDelete,
}: Props) {
  const { icon, category } = getBillIcon(expense.item);
  const isVariable = (expense.valueType ?? "variable") === "variable";
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(expense.item);
  const [editDay, setEditDay] = useState(expense.dueDay);
  const [editType, setEditType] = useState(expense.valueType ?? "variable");
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [monthValue, setMonthValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAttach = useRef<number | null>(null);

  const nb = useMemo(() => normalize(expense.item), [expense.item]);

  const getStatus = (month: number): BillStatus => {
    return records.find(r => normalize(r.bill) === nb && r.month === month)?.status ?? "pendente";
  };
  const getAttach = (month: number) =>
    attachments.find(a => normalize(a.bill) === nb && a.month === month && a.year === selectedYear);

  const values = useMemo(() => {
    const arr: number[] = [];
    for (let m = 0; m < 12; m++) {
      const v = expense.monthlyValues[m];
      if (typeof v === "number" && v > 0) arr.push(v);
    }
    return arr;
  }, [expense.monthlyValues]);

  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;

  const saveEdits = () => {
    onUpdateFixed({ item: editName.trim() || expense.item, dueDay: editDay, valueType: editType });
    setEditMode(false);
  };

  const startEditingMonth = (m: number) => {
    setEditingMonth(m);
    setMonthValue(String(expense.monthlyValues[m] ?? ""));
  };

  const saveMonthValue = () => {
    if (editingMonth == null) return;
    const n = parseFloat(monthValue.replace(",", "."));
    if (!isNaN(n) && n >= 0) onUpdateValue(editingMonth, n);
    setEditingMonth(null); setMonthValue("");
  };

  const handleAttachClick = (month: number) => {
    pendingAttach.current = month;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && pendingAttach.current != null) {
      // TODO: OCR pipeline — future: send `f` to an edge function that extracts value/date/vencimento
      onAttach(pendingAttach.current, f);
    }
    pendingAttach.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cycleStatus = (m: number) => {
    const cur = getStatus(m);
    const next: BillStatus = cur === "pendente" ? "paga" : cur === "paga" ? "divida" : "pendente";
    onUpdateStatus(m, next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="bg-surface w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border-subtle/60 flex items-start gap-3">
          <span className="h-12 w-12 rounded-2xl bg-background border border-border-subtle/60 flex items-center justify-center text-2xl shrink-0">
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            {editMode ? (
              <div className="space-y-2">
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full text-lg font-bold bg-background border border-border-subtle rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary" />
                <div className="flex gap-2 flex-wrap">
                  <label className="text-[11px] text-text-muted flex items-center gap-1">Dia
                    <input type="number" min={1} max={31} value={editDay} onChange={e => setEditDay(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                      className="w-14 text-sm bg-background border border-border-subtle rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary" />
                  </label>
                  <div className="flex gap-1 text-[11px]">
                    <button onClick={() => setEditType("fixed")} className={`px-2 py-1 rounded-full ${editType === "fixed" ? "bg-primary text-primary-foreground" : "bg-background border border-border-subtle text-text-secondary"}`}>Fixa</button>
                    <button onClick={() => setEditType("variable")} className={`px-2 py-1 rounded-full ${editType === "variable" ? "bg-primary text-primary-foreground" : "bg-background border border-border-subtle text-text-secondary"}`}>Variável</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">{expense.item}</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {category} · {isVariable ? "Recorrente variável" : "Recorrente fixa"} · Dia {expense.dueDay}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {editMode ? (
              <button onClick={saveEdits} className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition">
                <Save className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={() => setEditMode(true)} className="h-9 w-9 rounded-full bg-background border border-border-subtle text-text-secondary hover:bg-surface-hover flex items-center justify-center transition">
                <Edit3 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="h-9 w-9 rounded-full bg-background border border-border-subtle text-text-secondary hover:bg-surface-hover flex items-center justify-center transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Média" value={values.length ? fmt(avg) : "—"} />
            <StatCard icon={<ArrowUp className="h-4 w-4" />} label="Maior" value={values.length ? fmt(max) : "—"} />
            <StatCard icon={<ArrowDown className="h-4 w-4" />} label="Menor" value={values.length ? fmt(min) : "—"} />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Registos" value={`${values.length} / 12`} />
          </div>

          {/* OCR placeholder */}
          <button disabled className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-border-subtle/60 bg-background text-text-muted text-sm opacity-60 cursor-not-allowed">
            <Upload className="h-4 w-4" />
            Enviar fatura para leitura automática
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-secondary">Em breve</span>
          </button>

          {/* History */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Histórico {selectedYear}</h3>
            <div className="space-y-2">
              {MONTH_NAMES.map((name, m) => {
                const st = getStatus(m);
                const val = expense.monthlyValues[m] ?? 0;
                const att = getAttach(m);
                const meta = STATUS_META[st];
                const editing = editingMonth === m;
                return (
                  <div key={m} className="flex items-center gap-3 bg-background rounded-2xl border border-border-subtle/40 p-3">
                    <div className="h-10 w-10 rounded-xl bg-surface flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] text-text-muted font-semibold uppercase">{MONTH_SHORT[m]}</span>
                      <span className="text-xs font-bold text-foreground">{selectedYear.toString().slice(2)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {editing && isVariable ? (
                        <div className="flex gap-2 items-center">
                          <input
                            autoFocus type="number" inputMode="decimal" step="0.01"
                            value={monthValue} onChange={e => setMonthValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveMonthValue(); if (e.key === "Escape") setEditingMonth(null); }}
                            placeholder="0,00"
                            className="flex-1 text-sm bg-surface border border-border-subtle rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button onClick={saveMonthValue} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold">OK</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => isVariable && startEditingMonth(m)}
                          className={`text-left ${isVariable ? "hover:opacity-80" : "cursor-default"}`}
                        >
                          <p className="text-sm font-semibold text-foreground font-mono tabular-nums">
                            {val > 0 ? fmt(val) : <span className="text-text-muted font-normal">—</span>}
                          </p>
                          <p className="text-[10px] text-text-muted">{name}</p>
                        </button>
                      )}
                    </div>

                    <button onClick={() => cycleStatus(m)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${meta.className}`}>
                      {meta.label}
                    </button>

                    {att ? (
                      <div className="flex items-center gap-1">
                        <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" title={att.fileName}
                          className="text-status-paid hover:scale-110 transition-transform">
                          <FileCheck className="h-4 w-4" />
                        </a>
                        <button onClick={() => onRemoveAttachment(m)}
                          className="text-text-muted hover:text-status-negative transition-colors" title="Remover">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleAttachClick(m)}
                        className="text-text-muted hover:text-foreground transition-colors" title="Anexar comprovativo">
                        <Paperclip className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border-subtle/60 flex justify-between items-center gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-status-negative hover:bg-[hsl(var(--status-negative)/0.1)] transition-colors">
                <Trash2 className="h-4 w-4" /> Eliminar conta
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar «{expense.item}»?</AlertDialogTitle>
                <AlertDialogDescription>
                  A conta e o respetivo histórico deixarão de aparecer aqui. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-status-negative text-white hover:bg-status-negative/90">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
            Concluído
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background border border-border-subtle/40 p-3">
      <div className="flex items-center gap-1.5 text-text-muted">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-foreground font-mono tabular-nums mt-1">{value}</p>
    </div>
  );
}
