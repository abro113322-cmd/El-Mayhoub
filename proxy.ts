import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function proxy(
  request: NextRequest
) {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get("origin");

  if (
    pathname.startsWith("/api/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    (!origin || origin !== request.nextUrl.origin)
  ) {
    return NextResponse.json(
      { error: "Cross-origin state-changing requests are not allowed." },
      { status: 403 }
    );
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          // Update cookies on the incoming request
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          // Recreate response with updated request cookies
          response = NextResponse.next({
            request,
          });

          // Update cookies on the outgoing response
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Refresh and validate the authenticated user session. This server-side
  // result is the authorization source for dashboard access.
  const redirectWithSessionCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  };

  // Keep existing Super Admin API authorization unchanged. The matcher still
  // refreshes its session cookies, but route handlers make authorization calls.
  if (!pathname.startsWith("/dashboard")) {
    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return redirectWithSessionCookies(loginUrl);
  }

  if (!user.email_confirmed_at) {
    const verifyUrl = request.nextUrl.clone();
    verifyUrl.pathname = "/verify";
    verifyUrl.search = "";
    return redirectWithSessionCookies(verifyUrl);
  }

  if (pathname === "/dashboard/admin") {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "super_admin") {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      dashboardUrl.search = "";
      return redirectWithSessionCookies(dashboardUrl);
    }
  }

  return response;
}
