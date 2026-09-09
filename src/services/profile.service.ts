import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  full_name: string;
  username: string | null;
  email: string;
  role: "super_admin" | "admin" | "user";
  language: "ar" | "en";
  avatar_url: string | null;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    console.error(error);
    return null;
  }

  return data as UserProfile;
}

export async function updateUsername(username: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  return supabase
    .from("profiles")
    .update({
      username,
    })
    .eq("id", user.id);
}

export async function updateLanguage(language: "ar" | "en") {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  return supabase
    .from("profiles")
    .update({
      language,
    })
    .eq("id", user.id);
}

export async function updateAvatar(avatar_url: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  return supabase
    .from("profiles")
    .update({
      avatar_url,
    })
    .eq("id", user.id);
}

export async function isSuperAdmin() {
  const profile = await getCurrentProfile();

  return profile?.role === "super_admin";
}

export async function isAdmin() {
  const profile = await getCurrentProfile();

  return (
    profile?.role === "admin" ||
    profile?.role === "super_admin"
  );
}