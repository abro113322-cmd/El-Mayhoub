import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { mapCategory } from "@/lib/ai/categoryMapper";

export async function getCategoryByName(
  spaceId: string,
  categoryName: string
) {
  const mappedCategory = mapCategory(categoryName);

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("space_id", spaceId);

  if (error) {
    throw error;
  }

  const category = data.find(
    (item: any) =>
      item.name.toLowerCase() ===
      mappedCategory.toLowerCase()
  );

  return category ?? null;
}