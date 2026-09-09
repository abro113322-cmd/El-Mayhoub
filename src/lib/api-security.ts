import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_BODY_BYTES = 32 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const requests = new Map<string, { count: number; resetAt: number }>();

export const privateHeaders = {
  "Cache-Control": "private, no-store",
};

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: privateHeaders });
}

export function checkSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function checkRateLimit(request: Request, user: User) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${user.id}:${forwarded || "unknown"}`;
  const now = Date.now();
  const previous = requests.get(key);
  if (!previous || previous.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (previous.count >= MAX_REQUESTS) return false;
  previous.count += 1;
  return true;
}

export async function authenticateMutation(request: Request) {
  if (!checkSameOrigin(request)) return { response: apiError(403, "Invalid request origin") };
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return { response: apiError(413, "Request body is too large") };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { response: apiError(401, "Authentication required") };
  if (!checkRateLimit(request, data.user)) return { response: apiError(429, "Too many requests") };
  return { supabase, user: data.user };
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Error("Request body is too large");
  }
  return JSON.parse(text) as unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function unknownFields(body: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(body).find((key) => !allowed.includes(key));
}
