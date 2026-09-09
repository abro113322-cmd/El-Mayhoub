import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSafeDashboardDestination(
  value: string | null,
  origin: string
) {
  if (!value) {
    return "/dashboard";
  }

  try {
    const destination = new URL(value, origin);

    if (
      destination.origin === origin &&
      (destination.pathname === "/dashboard" ||
        destination.pathname.startsWith("/dashboard/"))
    ) {
      return `${destination.pathname}${destination.search}`;
    }
  } catch {
    // Invalid redirect destinations fall back to the dashboard.
  }

  return "/dashboard";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const dashboardPath = getSafeDashboardDestination(
    url.searchParams.get("next"),
    url.origin
  );

  const redirectUrl = new URL(dashboardPath, url.origin);
  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          response = NextResponse.redirect(redirectUrl);

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (!code) {
    const verifyUrl = new URL("/verify?error=confirmation", url.origin);
    return NextResponse.redirect(verifyUrl);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    const verifyUrl = new URL("/verify?error=confirmation", url.origin);
    return NextResponse.redirect(verifyUrl);
  }

  const fullName = data.user?.user_metadata?.full_name;
  const username = data.user?.user_metadata?.username;

  if (data.user) {
    await supabase
      .from("profiles")
      .update({
        full_name: typeof fullName === "string" ? fullName : null,
        username: typeof username === "string" ? username : null,
        email: data.user.email ?? null,
      })
      .eq("id", data.user.id);
  }

  return response;
}
