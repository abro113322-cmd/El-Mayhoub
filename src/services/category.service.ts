import { supabase } from "@/lib/supabase";
import { requireAuthenticatedUserId } from "./auth.service";
import { apiRequest } from "./api-client";

export interface Category {
  id?: string;

  space_id: string;

  name: string;

  kind: string;

  icon?: string;

  is_system?: boolean;
}

export async function getCategories(spaceId: string) {
  const userId = await requireAuthenticatedUserId();
  const { data: membership, error: membershipError } = await supabase
    .from("space_members")
    .select("space_id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("You are not a member of this space.");

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("space_id", spaceId)
    .order("name");

  if (error) throw error;

  return data;
}

export async function addCategory(category: Category) {
  const userId = await requireAuthenticatedUserId();
  const { data: membership, error: membershipError } = await supabase
    .from("space_members")
    .select("space_id")
    .eq("space_id", category.space_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("You are not a member of this space.");

  return apiRequest<Category>("/api/categories", {
    method: "POST",
    body: JSON.stringify({
      space_id: category.space_id,
      name: category.name,
      kind: category.kind,
      ...(category.icon !== undefined ? { icon: category.icon } : {}),
    }),
  });
}

export async function updateCategory(
  id: string,
  category: Partial<Category>
) {
  const userId = await requireAuthenticatedUserId();
  const { data: existing, error: lookupError } = await supabase
    .from("categories")
    .select("space_id, is_system")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existing) throw new Error("Category not found.");

  const { data: membership, error: membershipError } = await supabase
    .from("space_members")
    .select("space_id")
    .eq("space_id", existing.space_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("You are not a member of this space.");
  if (existing.is_system) {
    throw new Error("System categories cannot be modified.");
  }

  const { name, kind, icon } = category;

  return apiRequest<Category>("/api/categories", {
    method: "PATCH",
    body: JSON.stringify({
      id,
      ...(name !== undefined ? { name } : {}),
      ...(kind !== undefined ? { kind } : {}),
      ...(icon !== undefined ? { icon } : {}),
    }),
  });
}

export async function deleteCategory(id: string) {
  const userId = await requireAuthenticatedUserId();
  const { data: existing, error: lookupError } = await supabase
    .from("categories")
    .select("space_id, is_system")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existing) throw new Error("Category not found.");

  const { data: membership, error: membershipError } = await supabase
    .from("space_members")
    .select("space_id")
    .eq("space_id", existing.space_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("You are not a member of this space.");
  if (existing.is_system) {
    throw new Error("System categories cannot be deleted.");
  }

  await apiRequest<void>("/api/categories", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });

  return true;
}