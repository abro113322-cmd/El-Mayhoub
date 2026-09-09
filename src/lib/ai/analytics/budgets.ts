import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function getBudgets(
  userId: string
) {
  const { data, error } = await supabase
    .from("budgets")
    .select(`
      *,
      categories(name)
    `)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getBudgetSummary(
  userId: string
) {
  const budgets =
    await getBudgets(userId);

  const totalBudget = budgets.reduce(
    (sum, budget) =>
      sum + Number(budget.amount),
    0
  );

  const totalSpent = budgets.reduce(
    (sum, budget) =>
      sum + Number(budget.spent),
    0
  );

  const remaining =
    totalBudget - totalSpent;

  return {
    budgets,

    totalBudget,

    totalSpent,

    remaining,

    usage:
      totalBudget === 0
        ? 0
        : Number(
            (
              (totalSpent /
                totalBudget) *
              100
            ).toFixed(2)
          ),
  };
}