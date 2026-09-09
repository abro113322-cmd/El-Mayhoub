export interface AddTransactionData {
  userId: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  category: string;
  description?: string;
}

export interface AddBudgetData {
  userId: string;
  name: string;
  amount: number;
}

export interface AddSavingData {
  userId: string;
  name: string;
  target: number;
  current?: number;
}