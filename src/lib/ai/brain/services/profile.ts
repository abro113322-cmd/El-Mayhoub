import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function getUserProfile(
  userId: string
) {
  const { data, error } = await supabase
    .from("ai_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function saveUserProfile(
  userId: string,
  profile: Record<string, any>
) {
  const { error } = await supabase
    .from("ai_profiles")
    .upsert(
      {
        user_id: userId,
        ...profile,
      },
      {
        onConflict: "user_id",
      }
    );

  if (error) {
    throw error;
  }
}