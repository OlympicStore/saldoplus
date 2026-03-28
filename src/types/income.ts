export interface Income {
  id: string;
  date: string;
  description: string;
  value: number;
  person: string | null;
  type: "salary" | "other";
}

export interface SalaryConfig {
  person: string;
  value: number;
  active: boolean;
}
