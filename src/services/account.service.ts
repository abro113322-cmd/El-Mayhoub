import { apiRequest } from "./api-client";

export type AccountInput = {
  space_id: string;
  name: string;
  type: string;
  currency: string;
  opening_balance: number;
};

export function createAccount(input: AccountInput) {
  return apiRequest("/api/accounts", { method: "POST", body: JSON.stringify(input) });
}

export function updateAccount(id: string, input: Partial<AccountInput>) {
  return apiRequest("/api/accounts", { method: "PATCH", body: JSON.stringify({ id, ...input }) });
}

export function deleteAccount(id: string) {
  return apiRequest<void>("/api/accounts", { method: "DELETE", body: JSON.stringify({ id }) });
}
