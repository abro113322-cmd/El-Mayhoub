import { supabase } from "@/lib/supabase";

export async function requireAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to perform this action.");
  }

  return user.id;
}
