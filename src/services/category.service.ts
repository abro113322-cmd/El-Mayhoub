import { apiRequest } from "./api-client";

export type CategoryInput = {
  space_id: string;
  name: string;
  kind: string;
  icon?: string | null;
};

export function createCategory(input: CategoryInput) {
  return apiRequest("/api/categories", { method: "POST", body: JSON.stringify(input) });
}

export function updateCategory(id: string, input: Partial<CategoryInput>) {
  return apiRequest("/api/categories", { method: "PATCH", body: JSON.stringify({ id, ...input }) });
}

export function deleteCategory(id: string) {
  return apiRequest<void>("/api/categories", { method: "DELETE", body: JSON.stringify({ id }) });
}
