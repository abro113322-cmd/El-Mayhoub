import "server-only";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

// Production requires a distributed Redis-compatible REST provider (for example
// Upstash). Configure RATE_LIMIT_REDIS_REST_URL and
// RATE_LIMIT_REDIS_REST_TOKEN in the server environment; never expose either
// value through NEXT_PUBLIC_* variables.
const endpoint = process.env.RATE_LIMIT_REDIS_REST_URL;
const token = process.env.RATE_LIMIT_REDIS_REST_TOKEN;

function isConfigured() {
  return Boolean(endpoint && token);
}

export async function checkRateLimit(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  if (!isConfigured()) {
    throw new Error(
      "Distributed rate limiting is not configured. Set RATE_LIMIT_REDIS_REST_URL and RATE_LIMIT_REDIS_REST_TOKEN."
    );
  }

  const bucket = Math.floor(Date.now() / 1000 / options.windowSeconds);
  const key = `el-mayhoub:rate:${options.key}:${bucket}`;
  const response = await fetch(endpoint!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, options.windowSeconds],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Distributed rate-limit provider request failed.");
  }

  const result = (await response.json()) as Array<{
    result?: number;
  }>;
  const count = Number(result[0]?.result);

  if (!Number.isFinite(count)) {
    throw new Error("Distributed rate-limit provider returned invalid data.");
  }

  return {
    allowed: count <= options.limit,
    remaining: Math.max(options.limit - count, 0),
    retryAfterSeconds: options.windowSeconds,
  };
}

export function getRequestAddress(request: Request) {
  const forwardedAddress =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")
      : null;

  return (
    forwardedAddress?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Too many requests. Please try again later.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    }
  );
}
