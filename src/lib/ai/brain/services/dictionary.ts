import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function getUserDictionary(
  userId: string
) {
  const { data, error } = await supabase
    .from("ai_dictionary")
    .select("*")
    .eq("user_id", userId)
    .order("confidence", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addDictionaryAlias(
  userId: string,
  canonical: string,
  alias: string
) {
  const { error } = await supabase
    .from("ai_dictionary")
    .upsert(
      {
        user_id: userId,
        canonical,
        alias,
        confidence: 1,
      },
      {
        onConflict: "user_id,alias",
      }
    );

  if (error) {
    throw error;
  }
}

export async function increaseConfidence(
  userId: string,
  alias: string
) {
  const { data } = await supabase
    .from("ai_dictionary")
    .select("confidence")
    .eq("user_id", userId)
    .eq("alias", alias)
    .single();

  if (!data) {
    return;
  }

  await supabase
    .from("ai_dictionary")
    .update({
      confidence:
        Number(data.confidence) + 1,
    })
    .eq("user_id", userId)
    .eq("alias", alias);
}