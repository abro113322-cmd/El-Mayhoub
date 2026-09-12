import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireFinancialSameOrigin } from "@/lib/financial-security";

const privateHeaders = {
  "Cache-Control": "private, no-store",
};

function withPrivateHeaders(response: Response) {
  response.headers.set("Cache-Control", privateHeaders["Cache-Control"]);
  return response;
}

function decodeHeaderValue(value: string | null) {
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getClientIp(request: Request) {
  if (process.env.VERCEL !== "1") {
    return null;
  }

  const candidates = [
    request.headers.get("x-vercel-forwarded-for"),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const firstIp = candidate
      .split(",")
      .map((item) => item.trim())
      .find(Boolean);

    if (firstIp) return firstIp;
  }

  return null;
}

function getTrustedVercelHeader(
  request: Request,
  name: string
) {
  return process.env.VERCEL === "1"
    ? request.headers.get(name)
    : null;
}

export async function POST(request: Request) {
  try {
    const originError = requireFinancialSameOrigin(request);
    if (originError) return withPrivateHeaders(originError);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: privateHeaders }
      );
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Login activity profile lookup failed:",
        profileError
      );
    }

    const rawLatitude = getTrustedVercelHeader(
      request,
      "x-vercel-ip-latitude"
    );
    const rawLongitude = getTrustedVercelHeader(
      request,
      "x-vercel-ip-longitude"
    );

    const latitude = rawLatitude
      ? Number(rawLatitude)
      : null;
    const longitude = rawLongitude
      ? Number(rawLongitude)
      : null;

    const ipAddress = getClientIp(request);

    const { error: insertError } = await supabaseAdmin
      .from("login_activity")
      .insert({
        user_id: user.id,
        email: profile?.email ?? user.email ?? null,
        full_name:
          profile?.full_name ??
          (user.user_metadata?.full_name as string | undefined) ??
          null,
        ip_address: ipAddress,
        continent: getTrustedVercelHeader(
          request,
          "x-vercel-ip-continent"
        ),
        country: getTrustedVercelHeader(
          request,
          "x-vercel-ip-country"
        ),
        region: getTrustedVercelHeader(
          request,
          "x-vercel-ip-country-region"
        ),
        city: decodeHeaderValue(
          getTrustedVercelHeader(
            request,
            "x-vercel-ip-city"
          )
        ),
        latitude:
          Number.isFinite(latitude) ? latitude : null,
        longitude:
          Number.isFinite(longitude) ? longitude : null,
        timezone: getTrustedVercelHeader(
          request,
          "x-vercel-ip-timezone"
        ),
        postal_code: getTrustedVercelHeader(
          request,
          "x-vercel-ip-postal-code"
        ),
        user_agent: request.headers.get("user-agent"),
      });

    if (insertError) {
      console.error(
        "Login activity insert failed:",
        insertError
      );

      return NextResponse.json(
        { error: "Failed to record login activity" },
        { status: 500, headers: privateHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: privateHeaders });
  } catch (error) {
    console.error("Login activity POST error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: privateHeaders }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: privateHeaders }
      );
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Login activity admin profile lookup failed:",
        profileError
      );

      return NextResponse.json(
        { error: "Profile check failed" },
        { status: 500, headers: privateHeaders }
      );
    }

    if (profile?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: privateHeaders }
      );
    }

    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get("limit") ?? "200");
    const limit = Math.min(
      Math.max(Number.isFinite(limitParam) ? limitParam : 200, 1),
      500
    );

    const {
      data: activities,
      error: activityError,
    } = await supabaseAdmin
      .from("login_activity")
      .select(
        "id, user_id, email, full_name, ip_address, continent, country, region, city, latitude, longitude, timezone, postal_code, user_agent, logged_in_at"
      )
      .order("logged_in_at", { ascending: false })
      .limit(limit);

    if (activityError) {
      console.error(
        "Login activity load failed:",
        activityError
      );

      return NextResponse.json(
        { error: "Failed to load login activity" },
        { status: 500, headers: privateHeaders }
      );
    }

    return NextResponse.json({
      activities: activities ?? [],
    }, { headers: privateHeaders });
  } catch (error) {
    console.error("Login activity GET error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: privateHeaders }
    );
  }
}
