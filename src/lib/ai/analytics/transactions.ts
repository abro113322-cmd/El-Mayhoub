import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function getMonthlyTransactions(
  userId: string
) {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      categories(name)
    `)
    .eq("user_id", userId)
    .gte(
      "occurred_at",
      start.toISOString()
    )
    .lt(
      "occurred_at",
      end.toISOString()
    )
    .order("occurred_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getTotalExpenses(
  userId: string
) {
  const transactions =
    await getMonthlyTransactions(userId);

  return transactions
    .filter(
      (item) => item.type === "expense"
    )
    .reduce(
      (sum, item) =>
        sum + Number(item.amount),
      0
    );
}

export async function getTotalIncome(
  userId: string
) {
  const transactions =
    await getMonthlyTransactions(userId);

  return transactions
    .filter(
      (item) => item.type === "income"
    )
    .reduce(
      (sum, item) =>
        sum + Number(item.amount),
      0
    );
}