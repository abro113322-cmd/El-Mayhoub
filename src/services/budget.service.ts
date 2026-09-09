import { apiRequest } from "./api-client";

export type BudgetInput = {
  space_id: string;
  category_id: string;
  name: string;
  amount: number;
  period: string;
  start_date?: string;
  end_date?: string;
};

export function createBudget(input: BudgetInput) {
  return apiRequest("/api/budgets", { method: "POST", body: JSON.stringify(input) });
}

export function updateBudget(id: string, input: Partial<BudgetInput>) {
  return apiRequest("/api/budgets", { method: "PATCH", body: JSON.stringify({ id, ...input }) });
}

export function deleteBudget(id: string) {
  return apiRequest<void>("/api/budgets", { method: "DELETE", body: JSON.stringify({ id }) });
}
