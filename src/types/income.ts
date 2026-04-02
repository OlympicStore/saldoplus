export interface Income {
  id: string;
  date: string;
  description: string;
  value: number;
  person: string | null;
  type: "salary" | "other";
  account: string;
}

export interface SalaryConfig {
  person: string;
  monthlyValues: Record<number, number>; // value per month
  active: boolean;
}
