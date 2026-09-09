import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_CATEGORIES = [
  { name: "Salary", kind: "income", icon: "💰" },
  { name: "Food", kind: "expense", icon: "🍔" },
  { name: "Shopping", kind: "expense", icon: "🛍️" },
  { name: "Transport", kind: "expense", icon: "🚗" },
];

async function ensureMembership(spaceId: string, userId: string) {
  const { data: membership, error: lookupError } = await supabaseAdmin
    .from("space_members")
    .select("space_id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (membership) return;

  const { error } = await supabaseAdmin.from("space_members").insert({
    space_id: spaceId,
    user_id: userId,
    role: "admin",
  });

  if (error) throw error;
}

async function ensureDefaultCategories(spaceId: string) {
  const { data: categories, error: lookupError } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("space_id", spaceId)
    .limit(1);

  if (lookupError) throw lookupError;
  if (categories?.length) return;

  const { error } = await supabaseAdmin.from("categories").insert(
    DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      space_id: spaceId,
    }))
  );

  if (error) throw error;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Email confirmation is required" },
        { status: 403 }
      );
    }

    const { data: accounts, error: accountLookupError } = await supabaseAdmin
      .from("accounts")
      .select("id, space_id")
      .eq("created_by", user.id)
      .order("created_at", { ascending: true });

    if (accountLookupError) throw accountLookupError;

    const spaceIds = [
      ...new Set(
        (accounts ?? [])
          .map((account) => account.space_id)
          .filter((spaceId): spaceId is string => Boolean(spaceId))
      ),
    ];

    if (spaceIds.length) {
      const { data: spaces, error: spaceLookupError } = await supabaseAdmin
        .from("spaces")
        .select("id")
        .in("id", spaceIds);

      if (spaceLookupError) throw spaceLookupError;

      const existingSpaceIds = new Set((spaces ?? []).map((space) => space.id));

      for (const spaceId of spaceIds) {
        if (!existingSpaceIds.has(spaceId)) {
          const { error } = await supabaseAdmin.from("spaces").insert({
            id: spaceId,
            name: "Personal Space",
            type: "personal",
            owner_id: user.id,
            base_currency: "EGP",
          });

          if (error && error.code !== "23505") throw error;
        }

        await ensureMembership(spaceId, user.id);
        await ensureDefaultCategories(spaceId);
      }

      return NextResponse.json({ success: true });
    }

    const { data: space, error: spaceCreateError } = await supabaseAdmin
      .from("spaces")
      .insert({
        name: "Personal Space",
        type: "personal",
        owner_id: user.id,
        base_currency: "EGP",
      })
      .select("id")
      .single();

    if (spaceCreateError || !space) {
      throw spaceCreateError ?? new Error("Failed to create initial space.");
    }

    try {
      await ensureMembership(space.id, user.id);
      await ensureDefaultCategories(space.id);

      const { error: accountCreateError } = await supabaseAdmin
        .from("accounts")
        .insert({
          created_by: user.id,
          space_id: space.id,
          name: "Cash Wallet",
          type: "cash",
          currency: "EGP",
          opening_balance: 0,
        });

      if (accountCreateError) throw accountCreateError;
    } catch (error) {
      await supabaseAdmin.from("space_members").delete().eq("space_id", space.id);
      await supabaseAdmin.from("spaces").delete().eq("id", space.id);
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Onboarding setup error:", error);
    return NextResponse.json(
      { error: "Unable to set up your workspace." },
      { status: 500 }
    );
  }
}
