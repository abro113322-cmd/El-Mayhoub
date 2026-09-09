import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidCurrencyCode } from "@/lib/currency";

type SpaceBody = {
  name?: string;
  type?: string;
  owner_id?: string | null;
  base_currency?: string;
};

async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error(
      "Super Admin spaces profile check error:",
      profileError
    );

    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          error: "Profile check failed",
          details: profileError.message,
          code: profileError.code,
        },
        { status: 500 }
      ),
    };
  }

  if (!profile) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      ),
    };
  }

  if (profile.role !== "super_admin") {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    errorResponse: null,
  };
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

// GET
export async function GET() {
  try {
    const { user, errorResponse } =
      await requireSuperAdmin();

    if (errorResponse || !user) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    const [
      { data: spaces, error: spacesError },
      { data: profiles, error: profilesError },
      { data: members, error: membersError },
      { data: accounts, error: accountsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("spaces")
        .select(
          "id, name, type, owner_id, base_currency, created_at"
        )
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("profiles")
        .select("id, full_name, username, email"),

      supabaseAdmin
        .from("space_members")
        .select("space_id, user_id, role, created_at"),

      supabaseAdmin
        .from("accounts")
        .select("id, space_id"),
    ]);

    if (spacesError) {
      return NextResponse.json(
        {
          error: "Spaces query failed",
          details: spacesError.message,
          code: spacesError.code,
          hint: spacesError.hint ?? null,
        },
        { status: 500 }
      );
    }

    if (profilesError) {
      return NextResponse.json(
        {
          error: "Failed to load space owners",
          details: profilesError.message,
          code: profilesError.code,
        },
        { status: 500 }
      );
    }

    if (membersError) {
      return NextResponse.json(
        {
          error: "Failed to load space members",
          details: membersError.message,
          code: membersError.code,
        },
        { status: 500 }
      );
    }

    if (accountsError) {
      return NextResponse.json(
        {
          error: "Failed to load space accounts",
          details: accountsError.message,
          code: accountsError.code,
        },
        { status: 500 }
      );
    }

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile,
      ])
    );

    const memberCountMap = new Map<string, number>();
    for (const member of members ?? []) {
      memberCountMap.set(
        member.space_id,
        (memberCountMap.get(member.space_id) ?? 0) + 1
      );
    }

    const accountCountMap = new Map<string, number>();
    for (const account of accounts ?? []) {
      accountCountMap.set(
        account.space_id,
        (accountCountMap.get(account.space_id) ?? 0) + 1
      );
    }

    return NextResponse.json({
      success: true,
      spaces: (spaces ?? []).map((space) => {
        const owner = space.owner_id
          ? profileMap.get(space.owner_id)
          : null;

        return {
          ...space,
          owner: owner
            ? {
                id: owner.id,
                name:
                  owner.full_name ||
                  owner.username ||
                  owner.email ||
                  "Unknown User",
                username: owner.username,
                email: owner.email,
              }
            : null,
          members_count:
            memberCountMap.get(space.id) ?? 0,
          accounts_count:
            accountCountMap.get(space.id) ?? 0,
        };
      }),
    });
  } catch (error) {
    console.error(
      "Super Admin spaces GET API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

// POST
export async function POST(request: Request) {
  try {
    const { user: actor, errorResponse } =
      await requireSuperAdmin();

    if (errorResponse || !actor) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    let body: SpaceBody;

    try {
      body = (await request.json()) as SpaceBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const name = cleanText(body.name);
    const type = cleanText(body.type);
    const baseCurrency = cleanText(
      body.base_currency
    ).toUpperCase();

    const ownerId =
      body.owner_id === null
        ? null
        : cleanText(body.owner_id) || null;

    if (!name) {
      return NextResponse.json(
        { error: "Space name is required" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Space type is required" },
        { status: 400 }
      );
    }

    if (!isValidCurrencyCode(baseCurrency)) {
      return NextResponse.json(
        { error: "Base currency must be a three-letter code" },
        { status: 400 }
      );
    }

    let owner = null;

    if (ownerId) {
      const {
        data: ownerProfile,
        error: ownerError,
      } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, username, email, role"
        )
        .eq("id", ownerId)
        .maybeSingle();

      if (ownerError) {
        return NextResponse.json(
          {
            error: "Failed to verify owner",
            details: ownerError.message,
            code: ownerError.code,
          },
          { status: 500 }
        );
      }

      if (!ownerProfile) {
        return NextResponse.json(
          { error: "Selected owner does not exist" },
          { status: 404 }
        );
      }

      owner = ownerProfile;
    }

    const {
      data: space,
      error: createError,
    } = await supabaseAdmin
      .from("spaces")
      .insert({
        name,
        type,
        owner_id: ownerId,
        base_currency: baseCurrency,
      })
      .select(
        "id, name, type, owner_id, base_currency, created_at"
      )
      .single();

    if (createError || !space) {
      console.error(
        "Super Admin space create error:",
        createError
      );

      return NextResponse.json(
        {
          error: "Failed to create space",
          details:
            createError?.message ??
            "Unknown database error",
          code: createError?.code ?? null,
          hint: createError?.hint ?? null,
        },
        {
          status:
            createError?.code === "23505"
              ? 409
              : 500,
        }
      );
    }

    if (ownerId) {
      const {
        error: membershipError,
      } = await supabaseAdmin
        .from("space_members")
        .insert({
          space_id: space.id,
          user_id: ownerId,
          role: "admin",
        });

      if (membershipError) {
        console.error(
          "Initial owner membership insert error:",
          membershipError
        );

        await supabaseAdmin
          .from("spaces")
          .delete()
          .eq("id", space.id);

        return NextResponse.json(
          {
            error:
              "Failed to create the owner's space membership",
            details: membershipError.message,
            code: membershipError.code,
            hint: membershipError.hint ?? null,
          },
          { status: 500 }
        );
      }
    }

    const { error: auditError } =
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: actor.id,
          space_id: space.id,
          action: "SPACE_CREATE",
          entity_type: "space",
          entity_id: space.id,
          details: {
            new_values: space,
            owner_id: ownerId,
          },
        });

    if (auditError) {
      console.error(
        "Space create audit log error:",
        auditError
      );
    }

    return NextResponse.json(
      {
        success: true,
        space: {
          ...space,
          owner: owner
            ? {
                id: owner.id,
                name:
                  owner.full_name ||
                  owner.username ||
                  owner.email ||
                  "Unknown User",
                username: owner.username,
                email: owner.email,
              }
            : null,
        },
        message: "Space created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Super Admin spaces POST API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
