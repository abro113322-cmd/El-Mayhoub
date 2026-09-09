import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function rememberEntity(
  userId: string,
  entityType: string,
  entityName: string
) {
  const { error } = await supabase
    .from("ai_memory")
    .upsert(
      {
        user_id: userId,
        entity_type: entityType,
        entity_name: entityName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,entity_type",
      }
    );

  if (error) {
    throw error;
  }
}

export async function getLastEntity(
  userId: string,
  entityType: string
) {
  const { data, error } = await supabase
    .from("ai_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function clearMemory(
  userId: string,
  entityType: string
) {
  const { error } = await supabase
    .from("ai_memory")
    .delete()
    .eq("user_id", userId)
    .eq("entity_type", entityType);

  if (error) {
    throw error;
  }
}