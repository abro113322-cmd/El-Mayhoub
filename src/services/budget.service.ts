import { supabase } from "@/lib/supabase";
import { requireAuthenticatedUserId } from "./auth.service";
import { apiRequest } from "./api-client";

export interface Budget {
  id?: string;

  user_id: string;

  space_id: string;

  category_id: string;

  name: string;

  amount: number;

  spent?: number;

  start_date: string;

  end_date: string;
}

export async function getBudgets(userId: string) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to view these budgets.");
  }

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function addBudget(budget: Budget) {
  const userId = await requireAuthenticatedUserId();

  if (
    !Number.isFinite(budget.amount) ||
    budget.amount <= 0 ||
    !isValidDateRange(budget.start_date, budget.end_date)
  ) {
    throw new Error("Budget amount and dates are invalid.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("space_members")
    .select("space_id")
    .eq("space_id", budget.space_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("Budget space is not accessible.");

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", budget.category_id)
    .eq("space_id", budget.space_id)
    .maybeSingle();

  if (categoryError) throw categoryError;
  if (!category) throw new Error("Budget category is not accessible.");

  return apiRequest<Budget>("/api/budgets", {
    method: "POST",
    body: JSON.stringify({
      space_id: budget.space_id,
      category_id: budget.category_id,
      name: budget.name,
      amount: budget.amount,
      start_date: budget.start_date,
      end_date: budget.end_date,
    }),
  });
}

export async function updateBudget(
  userId: string,
  id: string,
  budget: Partial<Budget>
) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to update this budget.");
  }

  const budgetData = { ...budget };
  delete budgetData.user_id;
  delete budgetData.space_id;
  delete budgetData.category_id;
  delete budgetData.spent;

  if (
    budgetData.amount !== undefined &&
    (!Number.isFinite(budgetData.amount) || budgetData.amount <= 0)
  ) {
    throw new Error("Budget amount must be a positive number.");
  }

  if (
    (budgetData.start_date !== undefined ||
      budgetData.end_date !== undefined) &&
    !isValidDateRange(
      budgetData.start_date ?? "",
      budgetData.end_date ?? ""
    )
  ) {
    throw new Error("Budget dates are invalid.");
  }

  return apiRequest<Budget>("/api/budgets", {
    method: "PATCH",
    body: JSON.stringify({ id, ...budgetData }),
  });
}

export async function deleteBudget(userId: string, id: string) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to delete this budget.");
  }

  await apiRequest<void>("/api/budgets", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });

  return true;
}

function isValidDateRange(start: string, end: string) {
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);

  return (
    !Number.isNaN(startTime) &&
    !Number.isNaN(endTime) &&
    startTime <= endTime
  );
}
