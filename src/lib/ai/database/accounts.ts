import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function getDefaultAccount(
  userId: string
) {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("created_by", userId)
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  return data;
}