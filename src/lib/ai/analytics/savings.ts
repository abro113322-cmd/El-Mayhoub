import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function getSavings(
  userId: string
) {
  const { data, error } = await supabase
    .from("savings")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getSavingsSummary(
  userId: string
) {
  const savings =
    await getSavings(userId);

  const totalTarget = savings.reduce(
    (sum, saving) =>
      sum +
      Number(saving.target_amount),
    0
  );

  const totalCurrent = savings.reduce(
    (sum, saving) =>
      sum +
      Number(saving.current_amount),
    0
  );

  const remaining =
    totalTarget - totalCurrent;

  const progress =
    totalTarget === 0
      ? 0
      : Number(
          (
            (totalCurrent /
              totalTarget) *
            100
          ).toFixed(2)
        );

  return {
    savings,

    totalTarget,

    totalCurrent,

    remaining,

    progress,
  };
}