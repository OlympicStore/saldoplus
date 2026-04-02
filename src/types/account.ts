export interface Account {
  id: string;
  name: string;
  balance: number;
  type: "corrente" | "conjunta" | "poupanca" | "dinheiro";
  sort_order: number;
}
