import { supabase } from "@/lib/supabase";

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  totalSavings: number;
}

export async function getDashboardStats(userId: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", userId);

  if (error) throw error;

  const transactions = data ?? [];

  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpense = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalBalance = totalIncome - totalExpense;

  const { data: savings, error: savingsError } = await supabase
    .from("savings")
    .select("current_amount")
    .eq("user_id", userId);

  if (savingsError) throw savingsError;

  const totalSavings = (savings ?? []).reduce(
    (sum, saving) => sum + Number(saving.current_amount),
    0
  );

  return {
    totalIncome,
    totalExpense,
    totalBalance,
    totalSavings,
  };
}

export async function getRecentTransactions(userId: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(5);

  if (error) throw error;

  return data ?? [];
}