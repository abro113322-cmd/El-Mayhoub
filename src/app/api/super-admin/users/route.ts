import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      data: currentProfile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Current Super Admin profile lookup error:",
        profileError
      );
      return NextResponse.json(
        { error: "Profile lookup failed" },
        { status: 500 }
      );
    }

    if (!currentProfile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (currentProfile.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const {
      data: profiles,
      error: usersError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        `
          id,
          full_name,
          username,
          email,
          role,
          language,
          avatar_url,
          created_at
        `
      )
      .order("created_at", { ascending: false });

    if (usersError) {
      console.error(
        "Super Admin users loading error:",
        usersError
      );
      return NextResponse.json(
        { error: "Failed to load users" },
        { status: 500 }
      );
    }

    const users = await Promise.all(
      (profiles ?? []).map(async (profile) => {
        const {
          data: authUserData,
          error: authUserError,
        } = await supabaseAdmin.auth.admin.getUserById(
          profile.id
        );

        if (authUserError) {
          console.error(
            `Auth status lookup failed for ${profile.id}:`,
            authUserError
          );
          return {
            ...profile,
            status: "active" as const,
          };
        }

        const bannedUntil =
          authUserData?.user?.banned_until;

        const isDisabled = Boolean(
          bannedUntil &&
            new Date(bannedUntil).getTime() > Date.now()
        );

        return {
          ...profile,
          status: isDisabled
            ? ("disabled" as const)
            : ("active" as const),
        };
      })
    );

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error(
      "Super Admin users API error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentProfile, error: currentProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

    if (currentProfileError) {
      console.error("Create user profile check error:", currentProfileError);
      return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 });
    }

    if (!currentProfile || currentProfile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: {
      email?: string;
      password?: string;
      full_name?: string | null;
      username?: string | null;
      role?: "user" | "admin" | "super_admin";
      language?: "ar" | "en";
      avatar_url?: string | null;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const role = body.role ?? "user";
    if (!["user", "admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const language = body.language ?? "en";
    if (!["ar", "en"].includes(language)) {
      return NextResponse.json({ error: "Invalid language." }, { status: 400 });
    }

    const { data: createdAuth, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: body.full_name ?? null,
          username: body.username ?? null,
          language,
          avatar_url: body.avatar_url ?? null,
        },
      });

    if (createAuthError || !createdAuth.user) {
      console.error("Create Auth user error:", createAuthError);
      return NextResponse.json(
        { error: createAuthError?.message || "Failed to create authentication user." },
        { status: 500 }
      );
    }

    const newUserId = createdAuth.user.id;

    const { data: profile, error: profileUpsertError } =
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: newUserId,
            email,
            full_name: body.full_name ?? null,
            username: body.username ?? null,
            role,
            language,
            avatar_url: body.avatar_url ?? null,
          },
          { onConflict: "id" }
        )
        .select(
          "id, full_name, username, email, role, language, avatar_url, created_at"
        )
        .single();

    if (profileUpsertError || !profile) {
      console.error("Create profile error:", profileUpsertError);

      await supabaseAdmin.auth.admin.deleteUser(newUserId);

      return NextResponse.json(
        {
          error:
            profileUpsertError?.message ||
            "Failed to create user profile.",
        },
        { status: 500 }
      );
    }

    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        actor_id: user.id,
        action: "USER_CREATE",
        entity_type: "profile",
        entity_id: newUserId,
        details: {
          email,
          full_name: body.full_name ?? null,
          username: body.username ?? null,
          role,
          language,
        },
      });

    if (auditError) {
      console.error("User create audit log error:", auditError);
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          ...profile,
          status: "active",
        },
        message: "User created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Super Admin users POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
