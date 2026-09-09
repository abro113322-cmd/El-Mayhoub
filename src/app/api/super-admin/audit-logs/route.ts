import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
      "Audit logs profile check error:",
      profileError
    );

    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Profile check failed" },
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

  return { user, errorResponse: null };
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
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

    const { searchParams } =
      new URL(request.url);

    const action =
      searchParams.get("action")?.trim() || "";

    const actorId =
      searchParams.get("actor_id")?.trim() || "";

    const dateFrom =
      searchParams.get("date_from")?.trim() || "";

    const dateTo =
      searchParams.get("date_to")?.trim() || "";

    // --------------------------------------------------
    // Validate filters
    // --------------------------------------------------

    if (
      actorId &&
      !isValidUuid(actorId)
    ) {
      return NextResponse.json(
        { error: "Invalid actor_id" },
        { status: 400 }
      );
    }

    if (
      dateFrom &&
      !isValidDate(dateFrom)
    ) {
      return NextResponse.json(
        { error: "Invalid date_from" },
        { status: 400 }
      );
    }

    if (
      dateTo &&
      !isValidDate(dateTo)
    ) {
      return NextResponse.json(
        { error: "Invalid date_to" },
        { status: 400 }
      );
    }

    if (
      dateFrom &&
      dateTo &&
      dateFrom > dateTo
    ) {
      return NextResponse.json(
        {
          error:
            "date_from cannot be later than date_to",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Load audit logs
    // --------------------------------------------------

    let query = supabaseAdmin
      .from("audit_logs")
      .select(
        "id, actor_id, space_id, action, entity_type, entity_id, details, created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(500);

    if (action) {
      query = query.eq(
        "action",
        action
      );
    }

    if (actorId) {
      query = query.eq(
        "actor_id",
        actorId
      );
    }

    if (dateFrom) {
      query = query.gte(
        "created_at",
        `${dateFrom}T00:00:00.000Z`
      );
    }

    if (dateTo) {
      const endDate = new Date(
        `${dateTo}T00:00:00.000Z`
      );

      endDate.setUTCDate(
        endDate.getUTCDate() + 1
      );

      query = query.lt(
        "created_at",
        endDate.toISOString()
      );
    }

    const {
      data: logs,
      error,
    } = await query;

    if (error) {
      console.error(
        "Audit logs query error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to load audit logs",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // Load actors
    // --------------------------------------------------

    const actorIds = Array.from(
      new Set(
        (logs ?? [])
          .map(
            (log) => log.actor_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

    let actors: Record<
      string,
      {
        id: string;
        full_name: string | null;
        username: string | null;
        email: string | null;
      }
    > = {};

    if (actorIds.length > 0) {
      const {
        data: profiles,
        error: profilesError,
      } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, username, email"
        )
        .in("id", actorIds);

      if (profilesError) {
        console.error(
          "Audit log actor lookup error:",
          profilesError
        );
      } else {
        actors = Object.fromEntries(
          (profiles ?? []).map(
            (profile) => [
              profile.id,
              profile,
            ]
          )
        );
      }
    }

    // --------------------------------------------------
    // Normalize response
    // --------------------------------------------------

    const normalizedLogs =
      (logs ?? []).map((log) => ({
        ...log,

        actor: log.actor_id
          ? actors[log.actor_id] ??
            null
          : null,

        details:
          log.details &&
          typeof log.details ===
            "object"
            ? log.details
            : {},
      }));

    return NextResponse.json({
      success: true,
      logs: normalizedLogs,
      count: normalizedLogs.length,
      limited:
        normalizedLogs.length >= 500,
    });
  } catch (error) {
    console.error(
      "Super Admin audit logs API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}