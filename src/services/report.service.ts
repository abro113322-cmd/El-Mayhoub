import { supabase } from "@/lib/supabase";

export type ReportStats = {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  totalBalance: number;
};

export async function getReportStats(
  userId: string
): Promise<ReportStats> {
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", userId);

  if (error) throw error;

  let totalIncome = 0;
  let totalExpense = 0;

  data.forEach((item) => {
    if (item.type === "income") {
      totalIncome += Number(item.amount);
    }

    if (item.type === "expense") {
      totalExpense += Number(item.amount);
    }
  });

  const { data: savings } = await supabase
    .from("savings")
    .select("current_amount")
    .eq("user_id", userId);

  let totalSavings = 0;

  savings?.forEach((item) => {
    totalSavings += Number(item.current_amount);
  });

  return {
    totalIncome,
    totalExpense,
    totalSavings,
    totalBalance: totalIncome - totalExpense,
  };
}

export async function getExpensesByCategory(
  userId: string
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("category_id, amount, categories!transactions_category_id_fkey(name)")
    .eq("user_id", userId)
    .eq("type", "expense");

  if (error) throw error;

  const result: Record<string, number> = {};

  data.forEach((item: any) => {
    const category =
      item.categories?.name || "Other";

    result[category] =
      (result[category] || 0) + Number(item.amount);
  });

  return Object.entries(result).map(
    ([name, value]) => ({
      name,
      value,
    })
  );
}