import { NextResponse } from "next/server";

import {
  checkRateLimit,
  getRequestAddress,
  rateLimitResponse,
} from "@/lib/rate-limit";

const MAX_FINANCIAL_REQUEST_BYTES = 8_192;
export const MAX_FINANCIAL_AMOUNT = 1_000_000_000_000_000;

function getTrustedOrigin() {
  const configuredOrigin = process.env.APP_URL;

  if (!configuredOrigin) {
    return null;
  }

  return new URL(configuredOrigin).origin;
}

export function requireFinancialSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const trustedOrigin = getTrustedOrigin();

  if (!trustedOrigin) {
    return NextResponse.json(
      {
        error: "Financial mutations are not configured for this deployment.",
        code: "ORIGIN_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  if (!origin || origin !== trustedOrigin) {
    return NextResponse.json(
      {
        error: "Cross-origin financial mutations are not allowed.",
        code: "CSRF_REJECTED",
      },
      { status: 403 }
    );
  }

  return null;
}

export function requireFinancialJsonContentType(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();

  if (contentType !== "application/json") {
    return NextResponse.json(
      {
        error: "Content-Type must be application/json.",
        code: "UNSUPPORTED_MEDIA_TYPE",
      },
      { status: 415 }
    );
  }

  return null;
}

export async function enforceFinancialRateLimit(
  request: Request,
  userId: string
) {
  try {
    const userLimit = await checkRateLimit({
      key: `financial:user:${userId}`,
      limit: 60,
      windowSeconds: 60,
    });

    if (!userLimit.allowed) {
      return rateLimitResponse(userLimit.retryAfterSeconds);
    }

    const address = getRequestAddress(request);
    if (address !== "unknown") {
      const addressLimit = await checkRateLimit({
        key: `financial:ip:${address}`,
        limit: 180,
        windowSeconds: 60,
      });

      if (!addressLimit.allowed) {
        return rateLimitResponse(addressLimit.retryAfterSeconds);
      }
    }
  } catch (error) {
    console.error("Financial rate limiter unavailable:", error);
    return NextResponse.json(
      {
        error: "Financial mutations are temporarily unavailable.",
        code: "RATE_LIMIT_UNAVAILABLE",
      },
      { status: 503 }
    );
  }

  return null;
}

export async function readFinancialJsonBody(
  request: Request
): Promise<
  | { body: Record<string, unknown> | null; tooLarge: false }
  | { body: null; tooLarge: true }
> {
  const contentLength = Number(request.headers.get("content-length") ?? "");
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_FINANCIAL_REQUEST_BYTES
  ) {
    return { body: null, tooLarge: true };
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return { body: null, tooLarge: false };
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_FINANCIAL_REQUEST_BYTES) {
    return { body: null, tooLarge: true };
  }

  try {
    const body = JSON.parse(rawBody) as unknown;
    return {
      body:
        body && typeof body === "object" && !Array.isArray(body)
          ? (body as Record<string, unknown>)
          : null,
      tooLarge: false,
    };
  } catch {
    return { body: null, tooLarge: false };
  }
}
