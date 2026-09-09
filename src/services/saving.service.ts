import { supabase } from "@/lib/supabase";
import { requireAuthenticatedUserId } from "./auth.service";
import { requestFinancialMutation } from "@/lib/financial-api";

export type Saving = {
  id: string;
  user_id: string;
  space_id: string;

  name: string;

  target_amount: number;

  current_amount: number;

  deadline: string;

  created_at: string;
};

export async function getSavings(userId: string) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to view these savings.");
  }

  const { data, error } = await supabase
    .from("savings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as Saving[];
}

export async function createSaving(
  saving: Omit<Saving, "id" | "created_at">,
  idempotencyKey?: string
) {
  await requireAuthenticatedUserId();

  if (
    !Number.isFinite(saving.target_amount) ||
    saving.target_amount <= 0 ||
    !Number.isFinite(saving.current_amount) ||
    saving.current_amount < 0 ||
    saving.current_amount > saving.target_amount ||
    Number.isNaN(Date.parse(saving.deadline))
  ) {
    throw new Error("Saving goal values are invalid.");
  }

  const response = await requestFinancialMutation<{ saving: Saving }>(
    "/api/savings",
    "POST",
    {
      space_id: saving.space_id,
      name: saving.name,
      target_amount: saving.target_amount,
      current_amount: saving.current_amount,
      deadline: saving.deadline,
    },
    idempotencyKey
  );

  return response.saving;
}

export async function updateSaving(
  userId: string,
  id: string,
  saving: Partial<Saving>,
  idempotencyKey?: string
) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to update this saving goal.");
  }

  const savingData = { ...saving };
  delete savingData.user_id;
  delete savingData.space_id;
  delete savingData.current_amount;

  if (
    savingData.target_amount !== undefined &&
    (!Number.isFinite(savingData.target_amount) ||
      savingData.target_amount <= 0)
  ) {
    throw new Error("Saving target must be a positive number.");
  }

  if (
    savingData.deadline !== undefined &&
    Number.isNaN(Date.parse(savingData.deadline))
  ) {
    throw new Error("Saving deadline is invalid.");
  }

  const response = await requestFinancialMutation<{ saving: Saving }>(
    "/api/savings",
    "PATCH",
    {
      id,
      name: savingData.name,
      target_amount: savingData.target_amount,
      deadline: savingData.deadline,
    },
    idempotencyKey
  );

  return response.saving;
}

export async function deleteSaving(
  userId: string,
  id: string,
  idempotencyKey?: string
) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to delete this saving goal.");
  }

  await requestFinancialMutation("/api/savings", "DELETE", { id }, idempotencyKey);

  return true;
}
