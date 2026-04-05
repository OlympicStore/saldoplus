export type BillStatus = "pendente" | "paga" | "divida";

export type VariableCategory = "Comida" | "Sr. João" | "Carro (Gasolina)" | "Diversão";

export interface FixedExpense {
  id: string;
  item: string;
  dueDay: number;
  account: string;
  /** value per month (0-11) */
  monthlyValues: Record<number, number>;
  /** responsible per month (0-11) */
  monthlyResponsible: Record<number, string | null>;
  /** paid status per month (0-11) */
  monthlyPaid: Record<number, boolean>;
}

export interface VariableExpense {
  id: string;
  date: string;
  description: string;
  category: VariableCategory;
  value: number;
  responsible: string | null;
  account: string;
  recurring: boolean;
}

export interface MonthlyBillRecord {
  bill: string;
  month: number;
  year: number;
  status: BillStatus;
}

export interface BillAttachment {
  bill: string;
  month: number;
  fileName: string;
  fileUrl: string;
}
